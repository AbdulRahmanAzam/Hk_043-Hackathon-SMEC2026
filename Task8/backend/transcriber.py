import whisper
import os
import warnings

warnings.filterwarnings("ignore")

# Add FFmpeg to PATH for Whisper
ffmpeg_path = r"C:\Users\azama\AppData\Local\Microsoft\WinGet\Links"
if ffmpeg_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] = ffmpeg_path + os.pathsep + os.environ.get("PATH", "")

# load model once at module level
_model = None

# Language name mapping
LANGUAGE_NAMES = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
    'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
    'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish',
    'da': 'Danish', 'fi': 'Finnish', 'no': 'Norwegian', 'cs': 'Czech',
    'el': 'Greek', 'he': 'Hebrew', 'th': 'Thai', 'vi': 'Vietnamese',
    'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Filipino', 'uk': 'Ukrainian'
}

def get_whisper_model(model_size="small"):
    """
    Loads Whisper model. Using 'small' for better accuracy.
    Options: tiny, base, small, medium, large
    """
    global _model
    if _model is None:
        print(f"Loading Whisper {model_size} model...")
        _model = whisper.load_model(model_size)
        print("Model loaded successfully!")
    return _model


def transcribe_audio(audio_path, model_size="small"):
    """
    Takes an audio file and returns transcribed text.
    Uses OpenAI Whisper for offline transcription.
    Enhanced settings for better lyrics accuracy, especially for Hindi/Urdu.
    Returns: (transcript, segments, language_info)
    """
    if not os.path.exists(audio_path):
        print(f"Audio file missing: {audio_path}")
        return None, None, None
    
    try:
        model = get_whisper_model(model_size)
        
        # First, detect the language
        audio = whisper.load_audio(audio_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)
        _, probs = model.detect_language(mel)
        detected_language = max(probs, key=probs.get)
        print(f"Detected language: {LANGUAGE_NAMES.get(detected_language, detected_language)}")
        
        # Check if it's an Indic language (Hindi, Urdu, etc.)
        is_indic = detected_language in ['hi', 'ur', 'pa', 'bn', 'ta', 'te', 'mr', 'gu']
        
        # Enhanced transcription settings for lyrics
        # Different settings for Indic languages for better accuracy
        transcribe_options = {
            "fp16": False,  # CPU compatibility
            "language": detected_language,  # Use detected language
            "task": "transcribe",
            "verbose": False,
            "word_timestamps": True,  # Enable word-level timestamps
        }
        
        if is_indic:
            # Special settings for Hindi/Urdu and other Indic languages
            transcribe_options.update({
                "condition_on_previous_text": False,  # Prevent repetition
                "temperature": 0.0,  # More deterministic for Indic languages
                "compression_ratio_threshold": 2.6,  # Higher threshold for song lyrics
                "logprob_threshold": -0.8,  # More lenient for music
                "no_speech_threshold": 0.4,  # Lower for background music
                "initial_prompt": "This is a song with lyrics.",  # Hint to Whisper
            })
        else:
            # Settings for other languages
            transcribe_options.update({
                "condition_on_previous_text": False,
                "temperature": 0.2,
                "compression_ratio_threshold": 2.4,
                "logprob_threshold": -1.0,
                "no_speech_threshold": 0.5,
            })
        
        result = model.transcribe(audio_path, **transcribe_options)
        
        transcript = result.get("text", "")
        segments = result.get("segments", [])
        
        # Post-processing for better lyrics extraction
        if transcript and is_indic:
            # Clean up common Whisper artifacts in Indic languages
            transcript = clean_indic_transcript(transcript)
        
        # Get language info
        language_info = {
            "code": detected_language,
            "name": LANGUAGE_NAMES.get(detected_language, detected_language.capitalize()),
            "confidence": round(probs[detected_language] * 100, 1)
        }
        
        if not transcript.strip():
            return None, None, None
        
        return transcript.strip(), segments, language_info
        
    except Exception as e:
        print(f"Transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None


def clean_indic_transcript(text):
    """
    Clean up common Whisper transcription artifacts in Indic language lyrics.
    """
    import re
    
    # Remove excessive repetition (common in song transcriptions)
    words = text.split()
    cleaned_words = []
    prev_word = None
    repeat_count = 0
    
    for word in words:
        if word == prev_word:
            repeat_count += 1
            # Allow up to 3 repetitions (common in song choruses)
            if repeat_count < 3:
                cleaned_words.append(word)
        else:
            repeat_count = 0
            cleaned_words.append(word)
            prev_word = word
    
    text = ' '.join(cleaned_words)
    
    # Remove common artifacts
    text = re.sub(r'\[.*?\]', '', text)  # Remove [music] tags
    text = re.sub(r'\(.*?\)', '', text)  # Remove (background) tags
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    
    return text.strip()


def format_lyrics_with_timestamps(segments):
    """
    Formats transcription segments with timestamps.
    """
    if not segments:
        return ""
    
    formatted = []
    for seg in segments:
        start = seg.get('start', 0)
        text = seg.get('text', '').strip()
        if text:
            mins = int(start // 60)
            secs = int(start % 60)
            formatted.append(f"[{mins:02d}:{secs:02d}] {text}")
    
    return "\n".join(formatted)
