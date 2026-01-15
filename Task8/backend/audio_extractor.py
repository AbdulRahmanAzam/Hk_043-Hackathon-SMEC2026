import yt_dlp
import os


def grab_audio_from_yt(youtube_url, output_dir, job_id, progress_callback=None):
    """
    Downloads audio from YouTube using yt-dlp.
    Extracts as WAV for best transcription quality.
    Returns the path to the downloaded audio file.
    """
    output_template = os.path.join(output_dir, f"{job_id}_audio")
    
    # FFmpeg location for yt-dlp
    ffmpeg_location = r"C:\Users\azama\AppData\Local\Microsoft\WinGet\Links"
    
    def progress_hook(d):
        """Progress hook for download tracking"""
        if progress_callback and d['status'] == 'downloading':
            # Extract progress info
            downloaded = d.get('downloaded_bytes', 0)
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            speed = d.get('speed', 0)
            eta = d.get('eta', 0)
            
            if total > 0:
                percent = (downloaded / total) * 100
            else:
                percent = 0
            
            # Format speed
            if speed:
                speed_mb = speed / (1024 * 1024)  # Convert to MB/s
                speed_str = f"{speed_mb:.2f} MB/s"
            else:
                speed_str = "N/A"
            
            # Format ETA
            if eta:
                eta_min = eta // 60
                eta_sec = eta % 60
                eta_str = f"{int(eta_min)}m {int(eta_sec)}s" if eta_min > 0 else f"{int(eta_sec)}s"
            else:
                eta_str = "calculating..."
            
            progress_callback({
                'percent': round(percent, 1),
                'downloaded_mb': round(downloaded / (1024 * 1024), 2),
                'total_mb': round(total / (1024 * 1024), 2),
                'speed': speed_str,
                'eta': eta_str
            })
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'ffmpeg_location': ffmpeg_location,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        
        # yt-dlp adds the extension
        wav_path = output_template + ".wav"
        
        if os.path.exists(wav_path):
            return wav_path
        
        # check for other formats just in case
        for ext in ['.mp3', '.m4a', '.webm', '.opus']:
            alt_path = output_template + ext
            if os.path.exists(alt_path):
                return alt_path
        
        # check if file exists without extension (rare cases)
        if os.path.exists(output_template):
            return output_template
            
        return None
        
    except Exception as e:
        print(f"Download error: {e}")
        return None


def get_video_info(youtube_url):
    """
    Gets video metadata like title, duration, thumbnail.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail', ''),
                'channel': info.get('uploader', 'Unknown'),
                'view_count': info.get('view_count', 0)
            }
    except Exception as e:
        print(f"Info extraction error: {e}")
        return None
