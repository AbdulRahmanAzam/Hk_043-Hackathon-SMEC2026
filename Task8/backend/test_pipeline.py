"""
End-to-end pipeline test for YouTube Lyrics Extractor
"""
import os
import time

# Import all modules
from audio_extractor import grab_audio_from_yt, get_video_info
from transcriber import transcribe_audio, format_lyrics_with_timestamps
from text_processor import clean_lyrics, get_word_frequencies, analyze_sentiment
from cloud_maker import make_advanced_wordcloud

url = 'https://youtu.be/27sCc_J5ut8'
job_id = 'e2e_test'
temp_dir = 'temp_files'
output_dir = 'outputs'

os.makedirs(temp_dir, exist_ok=True)
os.makedirs(output_dir, exist_ok=True)

print('='*60)
print('END-TO-END PIPELINE TEST')
print('='*60)

# Step 1: Get video info
print()
print('STEP 1: Getting video info...')
video_info = get_video_info(url)
if video_info:
    print('  Title:', video_info.get('title'))
    print('  Duration:', video_info.get('duration'), 'seconds')
    print('  SUCCESS')
else:
    print('  ERROR: Could not get video info')
    exit(1)

# Step 2: Download audio
print()
print('STEP 2: Downloading audio...')
def progress_cb(data):
    percent = data.get('percent')
    print(f'  Progress: {percent}%')

audio_path = grab_audio_from_yt(url, temp_dir, job_id, progress_cb)
if audio_path and os.path.exists(audio_path):
    print('  Audio file:', audio_path)
    file_size = round(os.path.getsize(audio_path)/(1024*1024), 2)
    print('  Size:', file_size, 'MB')
    print('  SUCCESS')
else:
    print('  ERROR: Download failed')
    exit(1)

# Step 3: Transcribe
print()
print('STEP 3: Transcribing with Whisper...')
text, segments, lang_info = transcribe_audio(audio_path, 'small')
if text:
    print('  Language:', lang_info.get('name'))
    print('  Segments:', len(segments) if segments else 0)
    print('  Text length:', len(text), 'characters')
    print('  SUCCESS')
else:
    print('  ERROR: Transcription failed')
    exit(1)

# Step 4: Process text
print()
print('STEP 4: Processing text...')
cleaned = clean_lyrics(text)
word_freqs = get_word_frequencies(cleaned)
sentiment = analyze_sentiment(text)
print('  Unique words:', len(word_freqs))
print('  Sentiment:', sentiment.get('label'))
print('  SUCCESS')

# Step 5: Generate word cloud
print()
print('STEP 5: Generating word cloud...')
wc_path = os.path.join(output_dir, f'{job_id}_wordcloud.png')
make_advanced_wordcloud(word_freqs, wc_path, title=video_info.get('title', 'Song'))
if os.path.exists(wc_path):
    print('  Word cloud:', wc_path)
    wc_size = round(os.path.getsize(wc_path)/1024, 2)
    print('  Size:', wc_size, 'KB')
    print('  SUCCESS')
else:
    print('  ERROR: Word cloud not created')

# Cleanup
print()
print('STEP 6: Cleanup...')
try:
    os.remove(audio_path)
    print('  Removed temp audio file')
except:
    pass

print()
print('='*60)
print('PIPELINE TEST COMPLETE - ALL STEPS SUCCESSFUL!')
print('='*60)
