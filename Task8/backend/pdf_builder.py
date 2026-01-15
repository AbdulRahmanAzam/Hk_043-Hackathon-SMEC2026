from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
from datetime import datetime


def build_lyrics_pdf(lyrics_text, output_path, wordcloud_path=None, video_info=None, word_stats=None, lyrics_with_timestamps=None):
    """
    Creates a professional PDF with the song lyrics, word cloud, and analytics.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=HexColor('#e94560'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=HexColor('#666666'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#1a1a2e'),
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    lyrics_style = ParagraphStyle(
        'LyricsStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=18,
        spaceAfter=6,
        textColor=HexColor('#333333')
    )
    
    timestamp_style = ParagraphStyle(
        'TimestampStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=16,
        spaceAfter=4,
        textColor=HexColor('#666666'),
        fontName='Courier'
    )
    
    stat_style = ParagraphStyle(
        'StatStyle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=HexColor('#444444'),
        spaceAfter=8
    )
    
    content = []
    
    # Title
    song_title = video_info.get('title', 'Song Lyrics') if video_info else 'Song Lyrics'
    content.append(Paragraph(f"🎵 {song_title}", title_style))
    
    # Metadata
    if video_info:
        channel = video_info.get('channel', 'Unknown Artist')
        duration = video_info.get('duration', 0)
        mins, secs = divmod(duration, 60)
        content.append(Paragraph(f"Artist/Channel: {channel} | Duration: {int(mins)}:{int(secs):02d}", subtitle_style))
    
    content.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %H:%M')}", subtitle_style))
    content.append(Spacer(1, 20))
    
    # Word Cloud
    if wordcloud_path and os.path.exists(wordcloud_path):
        content.append(Paragraph("📊 Word Cloud Visualization", heading_style))
        img = Image(wordcloud_path, width=6*inch, height=3.4*inch)
        content.append(img)
        content.append(Spacer(1, 20))
    
    # Word Statistics
    if word_stats:
        content.append(Paragraph("📈 Lyrics Analytics", heading_style))
        
        stats_data = [
            ['Metric', 'Value'],
            ['Total Words', str(word_stats.get('total_words', 0))],
            ['Unique Words', str(word_stats.get('unique_words', 0))],
            ['Vocabulary Richness', f"{word_stats.get('vocabulary_richness', 0)}%"],
        ]
        
        # Top words
        top_words = word_stats.get('top_words', {})
        if top_words:
            top_5 = list(top_words.items())[:5]
            top_words_str = ', '.join([f"{w} ({c})" for w, c in top_5])
            stats_data.append(['Top 5 Words', top_words_str])
        
        stats_table = Table(stats_data, colWidths=[2*inch, 4*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f5f5f5')),
            ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#dddddd')),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        content.append(stats_table)
        content.append(Spacer(1, 25))
    
    # Lyrics with timestamps
    if lyrics_with_timestamps:
        content.append(Paragraph("🎤 Lyrics with Timestamps", heading_style))
        content.append(Spacer(1, 8))
        
        lines = lyrics_with_timestamps.split('\n')
        for line in lines:
            if line.strip():
                safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                content.append(Paragraph(safe_line, timestamp_style))
        
        content.append(PageBreak())
    
    # Plain lyrics
    content.append(Paragraph("📝 Full Lyrics", heading_style))
    content.append(Spacer(1, 8))
    
    if lyrics_text:
        # Split into paragraphs for better readability
        paragraphs = lyrics_text.split('. ')
        for para in paragraphs:
            if para.strip():
                safe_para = para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                content.append(Paragraph(safe_para + '.', lyrics_style))
    else:
        content.append(Paragraph("No lyrics could be extracted from this audio.", lyrics_style))
    
    content.append(Spacer(1, 30))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#999999'),
        alignment=TA_CENTER
    )
    content.append(Paragraph("─" * 60, footer_style))
    content.append(Paragraph("Generated by YouTube Lyrics Extractor | Powered by OpenAI Whisper", footer_style))
    
    doc.build(content)
    
    return output_path
