import whisper
import os

# load model once at module level
_model = None

def get_whisper_model():
    global _model
    if _model is None:
        # using base model - decent accuracy, not too slow
        # can change to 'small' or 'medium' for better results
        _model = whisper.load_model("base")
    return _model


def transcribe_audio(audio_path):
    """
    Takes an audio file and returns transcribed text.
    Uses OpenAI Whisper for offline transcription.
    """
    if not os.path.exists(audio_path):
        print(f"Audio file missing: {audio_path}")
        return None
    
    try:
        model = get_whisper_model()
        
        # transcribe with english detection
        result = model.transcribe(
            audio_path,
            fp16=False,  # cpu compatibility
            language=None,  # auto detect
            task="transcribe"
        )
        
        transcript = result.get("text", "")
        
        if not transcript.strip():
            return None
            
        return transcript.strip()
        
    except Exception as e:
        print(f"Transcription failed: {e}")
        return None
