import yt_dlp
import os


def grab_audio_from_yt(video_url, output_folder, file_prefix):
    """
    Downloads audio from youtube video and converts to wav format.
    Returns path to the downloaded file or None if failed.
    """
    output_template = os.path.join(output_folder, f"{file_prefix}_audio")
    
    ydl_config = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_config) as ydl:
            ydl.download([video_url])
        
        wav_file = output_template + ".wav"
        if os.path.exists(wav_file):
            return wav_file
        
        # sometimes extension differs
        for ext in ['.mp3', '.m4a', '.webm']:
            alt_path = output_template + ext
            if os.path.exists(alt_path):
                return alt_path
                
        return None
        
    except Exception as err:
        print(f"Download error: {err}")
        return None
