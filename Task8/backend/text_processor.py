import re
import string
from collections import Counter


# hardcoded english stopwords to avoid nltk dependency issues
STOP_WORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're",
    "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he',
    'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it', "it's",
    'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
    'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because',
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
    'just', 'don', "don't", 'should', "should've", 'now', 'd', 'll', 'm', 'o', 're',
    've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't",
    'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't",
    'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn',
    "needn't", 'shan', "shan't", 'shouldn', "shouldn't", 'wasn', "wasn't", 'weren',
    "weren't", 'won', "won't", 'wouldn', "wouldn't",
    # song filler words
    'uh', 'um', 'ah', 'oh', 'yeah', 'ya', 'gonna', 'wanna', 'gotta', 'na', 'la',
    'ooh', 'hey', 'like', 'know', 'get', 'got', 'let', 'come', 'go', 'see', 'say',
    'said', 'would', 'could', 'one', 'two', 'make', 'way', 'back', 'take', 'right'
}


def clean_lyrics(raw_text):
    """
    Cleans the raw transcribed text:
    - lowercase
    - remove punctuation
    - remove stopwords
    - remove short words
    """
    if not raw_text:
        return ""
    
    text = raw_text.lower()
    
    # get rid of punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # remove numbers
    text = re.sub(r'\d+', '', text)
    
    # extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def get_word_frequencies(cleaned_text):
    """
    Tokenizes text and counts word frequencies.
    Filters out stopwords and very short words.
    Returns dict of word -> count
    """
    if not cleaned_text:
        return {}
    
    # simple tokenization by splitting on whitespace
    tokens = cleaned_text.split()
    
    # filter tokens
    filtered = []
    for word in tokens:
        word = word.strip().lower()
        if len(word) > 2 and word not in STOP_WORDS and word.isalpha():
            filtered.append(word)
    
    freq = Counter(filtered)
    
    return dict(freq)
