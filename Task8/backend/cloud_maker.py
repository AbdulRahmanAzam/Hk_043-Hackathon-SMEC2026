from wordcloud import WordCloud
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import numpy as np
import os


def make_wordcloud(word_frequencies, output_path):
    """
    Creates a word cloud image from word frequency dict.
    Saves to output_path as PNG.
    """
    if not word_frequencies:
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


def make_advanced_wordcloud(word_frequencies, output_path, title="Song Lyrics"):
    """
    Creates an enhanced word cloud with multiple color schemes and styling.
    """
    if not word_frequencies:
        word_frequencies = {"no": 1, "lyrics": 1, "found": 1}
    
    # Create figure with dark theme
    fig, ax = plt.subplots(figsize=(16, 9), facecolor='#1a1a2e')
    
    # Generate wordcloud with custom settings
    wc = WordCloud(
        width=1600,
        height=800,
        background_color='#1a1a2e',
        max_words=200,
        min_font_size=8,
        max_font_size=150,
        colormap='plasma',
        prefer_horizontal=0.8,
        margin=15,
        relative_scaling=0.5,
        random_state=42,
        contour_width=2,
        contour_color='#e94560'
    )
    
    wc.generate_from_frequencies(word_frequencies)
    
    # Convert to array properly (fix numpy compatibility)
    wc_array = np.array(wc.to_image())
    
    # Display
    ax.imshow(wc_array, interpolation='bilinear')
    ax.axis('off')
    
    # Add title with styling
    fig.suptitle(
        f"Word Cloud: {title[:50]}..." if len(title) > 50 else f"Word Cloud: {title}",
        fontsize=20,
        color='#e94560',
        fontweight='bold',
        y=0.98
    )
    
    # Add subtitle
    ax.text(
        0.5, -0.02,
        f"Total unique words: {len(word_frequencies)} | Top word: {max(word_frequencies, key=word_frequencies.get) if word_frequencies else 'N/A'}",
        transform=ax.transAxes,
        fontsize=12,
        color='#a0a0a0',
        ha='center'
    )
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='#1a1a2e', edgecolor='none')
    plt.close()
    
    return output_path


def create_word_frequency_chart(word_frequencies, output_path, top_n=15):
    """
    Creates a horizontal bar chart of top word frequencies.
    """
    if not word_frequencies:
        return None
    
    # Get top words
    sorted_words = sorted(word_frequencies.items(), key=lambda x: x[1], reverse=True)[:top_n]
    words = [w[0] for w in sorted_words]
    counts = [w[1] for w in sorted_words]
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 8), facecolor='#1a1a2e')
    ax.set_facecolor('#1a1a2e')
    
    # Create gradient colors
    colors = plt.cm.plasma(np.linspace(0.2, 0.8, len(words)))
    
    # Horizontal bar chart
    bars = ax.barh(words[::-1], counts[::-1], color=colors[::-1], edgecolor='white', linewidth=0.5)
    
    # Add value labels
    for bar, count in zip(bars, counts[::-1]):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                str(count), va='center', color='white', fontsize=10)
    
    # Styling
    ax.set_xlabel('Frequency', color='white', fontsize=12)
    ax.set_title('Top Words in Lyrics', color='#e94560', fontsize=16, fontweight='bold', pad=20)
    ax.tick_params(colors='white')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color('#444')
    ax.spines['left'].set_color('#444')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='#1a1a2e')
    plt.close()
    
    return output_path
