# YouTube Lyrics Extractor

A web application that extracts lyrics from YouTube songs using AI-powered speech-to-text.

## Features
- Extract audio from YouTube videos
- Transcribe lyrics using Whisper (offline)
- Generate word cloud visualization
- Download lyrics as PDF

## Project Structure
```
Task8/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── audio_extractor.py   # YouTube audio download
│   ├── transcriber.py       # Whisper transcription
│   ├── text_processor.py    # Text cleaning & word freq
│   ├── cloud_maker.py       # Word cloud generation
│   ├── pdf_builder.py       # PDF generation
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process` | Start lyrics extraction (body: `{"url": "youtube_url"}`) |
| GET | `/api/status/{job_id}` | Check processing status |
| GET | `/download/wordcloud/{job_id}` | Download word cloud PNG |
| GET | `/download/pdf/{job_id}` | Download lyrics PDF |

## Setup Instructions

### Prerequisites
- Python 3.9+
- FFmpeg installed and in PATH

### Backend Setup

```bash
cd Task8/backend

# create virtual environment
python -m venv venv

# activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# install dependencies
pip install -r requirements.txt

# download nltk data (first run only)
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('punkt_tab')"

# run the server
python main.py
```

Backend runs at: http://localhost:8000

### Frontend Setup

```bash
cd Task8/frontend

# serve with any static server
python -m http.server 3000
```

Frontend runs at: http://localhost:3000

## Usage

1. Open http://localhost:3000 in browser
2. Paste a YouTube URL
3. Click "Extract Lyrics"
4. Wait for processing (may take a few minutes)
5. View lyrics and word cloud
6. Download as needed

## Notes

- First run downloads Whisper model (~150MB for base)
- Transcription time depends on video length
- Uses "base" Whisper model by default (edit transcriber.py for better accuracy)
- FFmpeg required for audio conversion
