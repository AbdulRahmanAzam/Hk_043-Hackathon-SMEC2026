# 🎵 YouTube Lyrics Extractor & Word Cloud Generator

A professional web application that extracts lyrics from YouTube songs using AI-powered speech-to-text (OpenAI Whisper), generates beautiful word cloud visualizations, performs sentiment analysis, and exports professional PDF reports.

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi)
![Whisper](https://img.shields.io/badge/OpenAI-Whisper-412991?logo=openai)

## ✨ Features

- 🎤 **AI-Powered Transcription** - Uses OpenAI Whisper for accurate speech-to-text
- ☁️ **Beautiful Word Clouds** - Stunning visualizations with dark theme
- 📊 **Sentiment Analysis** - Understand the emotional tone of lyrics
- 📝 **Timestamped Lyrics** - Get lyrics with precise timing
- 📈 **Word Statistics** - Total words, unique words, vocabulary richness
- 📄 **Professional PDF Export** - Download complete reports
- 🎨 **Modern React UI** - Animated, responsive, professional design
- 🔄 **Real-time Progress** - Live status updates during processing

## 🏗️ Project Structure

```
Task8/
├── backend/
│   ├── main.py              # FastAPI server with all endpoints
│   ├── audio_extractor.py   # YouTube audio download (yt-dlp)
│   ├── transcriber.py       # Whisper transcription with timestamps
│   ├── text_processor.py    # Text cleaning, word freq & sentiment
│   ├── cloud_maker.py       # Advanced word cloud generation
│   ├── pdf_builder.py       # Professional PDF generation
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/              # Static files
│   └── src/
│       ├── App.js           # Main React component
│       ├── App.css          # Complete styling
│       └── components/
│           ├── Header.js        # Navigation header
│           ├── URLInput.js      # URL input with model selector
│           ├── ProcessingStatus.js  # Progress display
│           ├── Results.js       # Results with downloads
│           ├── Features.js      # Feature showcase
│           └── Footer.js        # Page footer
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process` | Start lyrics extraction |
| GET | `/api/status/{job_id}` | Check processing status |
| GET | `/api/video-info?url=` | Get video metadata |
| GET | `/api/health` | Health check |
| GET | `/download/wordcloud/{job_id}` | Download word cloud PNG |
| GET | `/download/pdf/{job_id}` | Download lyrics PDF |

### Request Body for `/api/process`
```json
{
  "url": "https://youtube.com/watch?v=...",
  "model_size": "small"  // tiny, base, small, medium, large
}
```

## 🚀 Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- FFmpeg installed and in PATH

### Backend Setup

```bash
cd Task8/backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Backend runs at: **http://localhost:8000**

### Frontend Setup

```bash
cd Task8/frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs at: **http://localhost:3000**

## 📖 Usage

1. Open http://localhost:3000 in your browser
2. Paste a YouTube URL (music video with vocals)
3. Select Whisper model size (small recommended for balance)
4. Click "Extract Lyrics" 
5. Watch real-time progress updates
6. View word cloud, lyrics, stats, and sentiment analysis
7. Download word cloud (PNG) or full report (PDF)

## 🎛️ Whisper Model Sizes

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 39MB | Fastest | Lower |
| base | 74MB | Fast | Good |
| **small** | 244MB | Medium | **Recommended** |
| medium | 769MB | Slow | Better |
| large | 1.5GB | Slowest | Best |

## 📋 Notes

- First run downloads the selected Whisper model
- Transcription time depends on video length and model size
- FFmpeg is required for audio conversion
- Works best with clear vocal tracks
- Instrumental-heavy songs may have less accurate results

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Framer Motion (animations)
- React Icons
- Axios (HTTP client)
- React Toastify (notifications)

**Backend:**
- FastAPI
- OpenAI Whisper
- yt-dlp
- WordCloud + Matplotlib
- ReportLab (PDF generation)

---

Made with ❤️ for SMEC 2026 Hackathon
