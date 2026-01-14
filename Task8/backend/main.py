from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
import os

from audio_extractor import grab_audio_from_yt
from transcriber import transcribe_audio
from text_processor import clean_lyrics, get_word_frequencies
from cloud_maker import make_wordcloud
from pdf_builder import build_lyrics_pdf

app = FastAPI(title="Lyrics Extractor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# store job status
jobs = {}

TEMP_DIR = "temp_files"
OUTPUT_DIR = "outputs"

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


class YoutubeRequest(BaseModel):
    url: str


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    lyrics: str = None
    wordcloud_url: str = None
    pdf_url: str = None


def process_video(job_id: str, yt_url: str):
    try:
        jobs[job_id]["status"] = "downloading"
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = "Downloading audio from YouTube..."
        
        audio_path = grab_audio_from_yt(yt_url, TEMP_DIR, job_id)
        
        if not audio_path or not os.path.exists(audio_path):
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = "Failed to download audio"
            return
        
        jobs[job_id]["status"] = "transcribing"
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Transcribing audio (this may take a while)..."
        
        raw_text = transcribe_audio(audio_path)
        
        if not raw_text:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = "Transcription failed"
            return
        
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 70
        jobs[job_id]["message"] = "Cleaning text and generating word cloud..."
        
        cleaned = clean_lyrics(raw_text)
        word_freqs = get_word_frequencies(cleaned)
        
        # wordcloud
        wc_filename = f"{job_id}_wordcloud.png"
        wc_path = os.path.join(OUTPUT_DIR, wc_filename)
        make_wordcloud(word_freqs, wc_path)
        
        jobs[job_id]["progress"] = 85
        jobs[job_id]["message"] = "Building PDF..."
        
        # pdf
        pdf_filename = f"{job_id}_lyrics.pdf"
        pdf_path = os.path.join(OUTPUT_DIR, pdf_filename)
        build_lyrics_pdf(raw_text, pdf_path, wc_path)
        
        # cleanup temp audio
        try:
            os.remove(audio_path)
        except:
            pass
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Complete!"
        jobs[job_id]["lyrics"] = raw_text
        jobs[job_id]["wordcloud_url"] = f"/download/wordcloud/{job_id}"
        jobs[job_id]["pdf_url"] = f"/download/pdf/{job_id}"
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = f"Error: {str(e)}"


@app.post("/api/process")
async def start_processing(req: YoutubeRequest, bg_tasks: BackgroundTasks):
    if not req.url or "youtube" not in req.url and "youtu.be" not in req.url:
        raise HTTPException(400, "Invalid YouTube URL")
    
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Starting...",
        "lyrics": None,
        "wordcloud_url": None,
        "pdf_url": None
    }
    
    bg_tasks.add_task(process_video, job_id, req.url)
    
    return {"job_id": job_id}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    return jobs[job_id]


@app.get("/download/wordcloud/{job_id}")
async def download_wordcloud(job_id: str):
    filepath = os.path.join(OUTPUT_DIR, f"{job_id}_wordcloud.png")
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found")
    return FileResponse(filepath, filename="wordcloud.png", media_type="image/png")


@app.get("/download/pdf/{job_id}")
async def download_pdf(job_id: str):
    filepath = os.path.join(OUTPUT_DIR, f"{job_id}_lyrics.pdf")
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found")
    return FileResponse(filepath, filename="lyrics.pdf", media_type="application/pdf")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, loop="asyncio")
