from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
import os
import re
import json
from datetime import datetime
from typing import Optional, List

from audio_extractor import grab_audio_from_yt, get_video_info
from transcriber import transcribe_audio, format_lyrics_with_timestamps
from text_processor import clean_lyrics, get_word_frequencies, analyze_sentiment
from cloud_maker import make_wordcloud, make_advanced_wordcloud
from pdf_builder import build_lyrics_pdf

app = FastAPI(title="Lyrics Extractor API", version="2.0.0")
print("FastAPI app created")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("CORS middleware added")

# store job status
jobs = {}

# History storage (in-memory, persists during session)
history = []

TEMP_DIR = "temp_files"
OUTPUT_DIR = "outputs"
HISTORY_FILE = "outputs/history.json"

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load history from file if exists
def load_history():
    global history
    try:
        print("Loading history...")
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
            print(f"Loaded {len(history)} history items")
        else:
            print("History file not found, starting fresh")
    except Exception as e:
        print(f"Error loading history: {e}")
        history = []

def save_history():
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history[-50:], f, ensure_ascii=False, indent=2)  # Keep last 50
    except:
        pass

load_history()


class YoutubeRequest(BaseModel):
    url: str
    model_size: str = "small"  # tiny, base, small, medium, large


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    lyrics: str = None
    lyrics_with_timestamps: str = None
    wordcloud_url: str = None
    pdf_url: str = None
    video_info: dict = None
    word_stats: dict = None
    sentiment: dict = None
    download_progress: dict = None


def process_video(job_id: str, yt_url: str, model_size: str = "small"):
    try:
        # Get video info first
        jobs[job_id]["status"] = "fetching_info"
        jobs[job_id]["progress"] = 5
        jobs[job_id]["message"] = "Fetching video information..."
        
        video_info = get_video_info(yt_url)
        jobs[job_id]["video_info"] = video_info
        
        jobs[job_id]["status"] = "downloading"
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = "Starting audio download from YouTube..."
        jobs[job_id]["download_progress"] = None
        
        # Progress callback for download tracking
        def update_download_progress(progress_data):
            jobs[job_id]["download_progress"] = progress_data
            jobs[job_id]["message"] = f"Downloading: {progress_data['percent']}% at {progress_data['speed']} (ETA: {progress_data['eta']})"
            # Update overall progress (10-24% for download phase)
            jobs[job_id]["progress"] = 10 + int(progress_data['percent'] * 0.14)
        
        audio_path = grab_audio_from_yt(yt_url, TEMP_DIR, job_id, update_download_progress)
        
        if not audio_path or not os.path.exists(audio_path):
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = "Failed to download audio"
            return
        
        jobs[job_id]["status"] = "transcribing"
        jobs[job_id]["progress"] = 25
        jobs[job_id]["message"] = f"Transcribing audio with Whisper ({model_size} model)..."
        
        raw_text, segments, language_info = transcribe_audio(audio_path, model_size)
        
        if not raw_text:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = "Transcription failed - no lyrics detected"
            return
        
        # Store language info
        jobs[job_id]["language"] = language_info
        
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 60
        jobs[job_id]["message"] = "Processing lyrics and analyzing text..."
        
        # Format with timestamps
        lyrics_with_ts = format_lyrics_with_timestamps(segments) if segments else raw_text
        
        cleaned = clean_lyrics(raw_text)
        word_freqs = get_word_frequencies(cleaned)
        
        # Get word statistics
        total_words = sum(word_freqs.values())
        unique_words = len(word_freqs)
        top_words = sorted(word_freqs.items(), key=lambda x: x[1], reverse=True)[:20]
        
        jobs[job_id]["word_stats"] = {
            "total_words": total_words,
            "unique_words": unique_words,
            "top_words": dict(top_words),
            "vocabulary_richness": round(unique_words / max(total_words, 1) * 100, 2)
        }
        
        # Sentiment analysis
        sentiment = analyze_sentiment(raw_text)
        jobs[job_id]["sentiment"] = sentiment
        
        jobs[job_id]["progress"] = 75
        jobs[job_id]["message"] = "Generating word cloud..."
        
        # Advanced wordcloud
        wc_filename = f"{job_id}_wordcloud.png"
        wc_path = os.path.join(OUTPUT_DIR, wc_filename)
        
        song_title = video_info.get('title', 'Song') if video_info else 'Song'
        make_advanced_wordcloud(word_freqs, wc_path, title=song_title)
        
        jobs[job_id]["progress"] = 85
        jobs[job_id]["message"] = "Building PDF document..."
        
        # Enhanced PDF
        pdf_filename = f"{job_id}_lyrics.pdf"
        pdf_path = os.path.join(OUTPUT_DIR, pdf_filename)
        build_lyrics_pdf(
            raw_text, 
            pdf_path, 
            wc_path, 
            video_info=video_info,
            word_stats=jobs[job_id]["word_stats"],
            lyrics_with_timestamps=lyrics_with_ts
        )
        
        # cleanup temp audio
        try:
            os.remove(audio_path)
        except:
            pass
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Complete!"
        jobs[job_id]["lyrics"] = raw_text
        jobs[job_id]["lyrics_with_timestamps"] = lyrics_with_ts
        jobs[job_id]["wordcloud_url"] = f"/download/wordcloud/{job_id}"
        jobs[job_id]["pdf_url"] = f"/download/pdf/{job_id}"
        
        # Add to history
        history_entry = {
            "job_id": job_id,
            "timestamp": datetime.now().isoformat(),
            "video_info": video_info,
            "language": jobs[job_id].get("language"),
            "word_stats": jobs[job_id]["word_stats"],
            "sentiment": jobs[job_id]["sentiment"]
        }
        history.append(history_entry)
        save_history()
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = f"Error: {str(e)}"
        import traceback
        traceback.print_exc()


@app.post("/api/process")
async def start_processing(req: YoutubeRequest):
    if not req.url or ("youtube" not in req.url and "youtu.be" not in req.url):
        raise HTTPException(400, "Invalid YouTube URL")
    
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Starting...",
        "lyrics": None,
        "lyrics_with_timestamps": None,
        "wordcloud_url": None,
        "pdf_url": None,
        "video_info": None,
        "word_stats": None,
        "sentiment": None,
        "language": None,
        "download_progress": None
    }
    
    # Start processing in background
    import threading
    thread = threading.Thread(target=process_video, args=(job_id, req.url, req.model_size))
    thread.daemon = True
    thread.start()
    
    return {"job_id": job_id}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    return jobs[job_id]


@app.get("/api/video-info")
async def get_video_metadata(url: str):
    """Get video info without processing"""
    if not url or ("youtube" not in url and "youtu.be" not in url):
        raise HTTPException(400, "Invalid YouTube URL")
    
    info = get_video_info(url)
    if not info:
        raise HTTPException(500, "Could not fetch video info")
    
    return info


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


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/api/history")
async def get_history():
    """Get extraction history"""
    return {"history": history[::-1]}  # Most recent first


@app.delete("/api/history")
async def clear_history():
    """Clear extraction history"""
    global history
    history = []
    save_history()
    return {"message": "History cleared"}


@app.get("/download/txt/{job_id}")
async def download_txt(job_id: str):
    """Download lyrics as plain text"""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    lyrics = jobs[job_id].get("lyrics", "")
    if not lyrics:
        raise HTTPException(404, "No lyrics found")
    
    return PlainTextResponse(
        content=lyrics,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=lyrics_{job_id}.txt"}
    )


@app.get("/download/json/{job_id}")
async def download_json(job_id: str):
    """Download full analysis as JSON"""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    
    job_data = jobs[job_id]
    export_data = {
        "job_id": job_id,
        "video_info": job_data.get("video_info"),
        "lyrics": job_data.get("lyrics"),
        "lyrics_with_timestamps": job_data.get("lyrics_with_timestamps"),
        "language": job_data.get("language"),
        "word_stats": job_data.get("word_stats"),
        "sentiment": job_data.get("sentiment"),
        "exported_at": datetime.now().isoformat()
    }
    
    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": f"attachment; filename=lyrics_{job_id}.json"}
    )


if __name__ == "__main__":
    print("Starting server...")
    try:
        import uvicorn
        print("Uvicorn imported successfully")
        print("Starting uvicorn server...")
        # Run without threading to avoid interrupt issues
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=False, log_level="info")
    except Exception as e:
        print(f"Error starting server: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")
