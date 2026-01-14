from wordcloud import WordCloud
import os


def make_wordcloud(word_frequencies, output_path):
    """
    Creates a word cloud image from word frequency dict.
    Saves to output_path as PNG.
    """
    if not word_frequencies:
        # make a dummy cloud if no words
        word_frequencies = {"no": 1, "lyrics": 1, "found": 1}
    
    wc = WordCloud(
        width=800,
        height=400,
        background_color='white',
        max_words=150,
        min_font_size=10,
        max_font_size=100,
        colormap='viridis',
        prefer_horizontal=0.7,
        margin=10
    )
    
    wc.generate_from_frequencies(word_frequencies)
    
    wc.to_file(output_path)
    
    return output_path
