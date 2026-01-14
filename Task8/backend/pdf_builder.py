from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.units import inch
import os


def build_lyrics_pdf(lyrics_text, output_path, wordcloud_path=None):
    """
    Creates a PDF with the song lyrics and optionally the word cloud.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    styles = getSampleStyleSheet()
    
    # custom style for lyrics
    lyrics_style = ParagraphStyle(
        'LyricsStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        spaceAfter=8
    )
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20
    )
    
    content = []
    
    # title
    content.append(Paragraph("Song Lyrics", title_style))
    content.append(Spacer(1, 12))
    
    # add wordcloud if exists
    if wordcloud_path and os.path.exists(wordcloud_path):
        img = Image(wordcloud_path, width=5*inch, height=2.5*inch)
        content.append(img)
        content.append(Spacer(1, 20))
        content.append(Paragraph("Word Cloud", styles['Heading2']))
        content.append(Spacer(1, 12))
    
    content.append(Paragraph("Transcribed Lyrics:", styles['Heading2']))
    content.append(Spacer(1, 8))
    
    # split lyrics into paragraphs
    if lyrics_text:
        lines = lyrics_text.split('\n')
        for line in lines:
            if line.strip():
                # escape special chars for reportlab
                safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                content.append(Paragraph(safe_line, lyrics_style))
            else:
                content.append(Spacer(1, 6))
    else:
        content.append(Paragraph("No lyrics could be extracted.", lyrics_style))
    
    doc.build(content)
    
    return output_path
