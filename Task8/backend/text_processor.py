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

# Hindi stopwords (common words in Hindi songs - Romanized)
HINDI_STOP_WORDS = {
    # Common Hindi words (Romanized)
    'hai', 'hain', 'ho', 'tha', 'the', 'thi', 'kya', 'ki', 'ka', 'ke', 'ko', 'se',
    'me', 'mein', 'par', 'pe', 'aur', 'ya', 'bhi', 'jo', 'ab', 'toh', 'to', 'yeh',
    'ye', 'woh', 'wo', 'yahan', 'wahan', 'kahan', 'kaun', 'kab', 'kyun', 'kaise',
    'aise', 'jaise', 'sab', 'kuch', 'koi', 'na', 'nahi', 'nahin', 'hi', 'tha', 'thi',
    'the', 'hoon', 'hun', 'hai', 'hain', 'ho', 'hua', 'hui', 'hue', 'raha', 'rahe',
    'rahi', 'gaya', 'gayi', 'gaye', 'jata', 'jati', 'jate', 'sakta', 'sakti', 'sakte',
    # Devanagari script common words
    'है', 'हैं', 'हो', 'था', 'थे', 'थी', 'क्या', 'की', 'का', 'के', 'को', 'से',
    'में', 'मैं', 'पर', 'और', 'या', 'भी', 'जो', 'अब', 'तो', 'यह', 'ये', 'वह',
    'वो', 'यहाँ', 'वहाँ', 'कहाँ', 'कौन', 'कब', 'क्यों', 'कैसे', 'ऐसे', 'जैसे',
    'सब', 'कुछ', 'कोई', 'न', 'नहीं', 'हूँ', 'हूं', 'हुआ', 'हुई', 'हुए', 'रहा',
    'रहे', 'रही', 'गया', 'गयी', 'गये', 'जाता', 'जाती', 'जाते', 'सकता', 'सकती',
    'सकते', 'था', 'थी', 'थे'
}

# Urdu stopwords (common words in Urdu songs - Romanized)
URDU_STOP_WORDS = {
    # Common Urdu words (Romanized)
    'hai', 'hain', 'ho', 'tha', 'the', 'thi', 'kya', 'ki', 'ka', 'ke', 'ko', 'se',
    'mein', 'par', 'aur', 'ya', 'bhi', 'jo', 'ab', 'toh', 'yeh', 'ye', 'woh', 'wo',
    'yahan', 'wahan', 'kahan', 'kaun', 'kab', 'kyun', 'kaise', 'sab', 'kuch', 'koi',
    'na', 'nahi', 'hoon', 'hun', 'hua', 'hui', 'hue', 'raha', 'rahe', 'rahi', 'gaya',
    'gayi', 'jata', 'jati', 'sakta', 'sakti', 'agar', 'lekin', 'magar', 'phir',
    # Urdu script common words
    'ہے', 'ہیں', 'ہو', 'تھا', 'تھے', 'تھی', 'کیا', 'کی', 'کا', 'کے', 'کو', 'سے',
    'میں', 'پر', 'اور', 'یا', 'بھی', 'جو', 'اب', 'تو', 'یہ', 'یے', 'وہ', 'وو',
    'یہاں', 'وہاں', 'کہاں', 'کون', 'کب', 'کیوں', 'کیسے', 'سب', 'کچھ', 'کوئی',
    'نہ', 'نہیں', 'ہوں', 'ہوا', 'ہوئی', 'ہوئے', 'رہا', 'رہے', 'رہی', 'گیا',
    'گئی', 'جاتا', 'جاتی', 'سکتا', 'سکتی', 'اگر', 'لیکن', 'مگر', 'پھر'
}

# Combine all stopwords
ALL_STOP_WORDS = STOP_WORDS | HINDI_STOP_WORDS | URDU_STOP_WORDS

# Sentiment word lists
POSITIVE_WORDS = {
    # English positive words
    'love', 'happy', 'joy', 'beautiful', 'amazing', 'wonderful', 'great', 'good',
    'best', 'hope', 'dream', 'smile', 'laugh', 'fun', 'peace', 'free', 'freedom',
    'bright', 'light', 'sunshine', 'heaven', 'angel', 'perfect', 'sweet', 'lovely',
    'blessed', 'grateful', 'thankful', 'celebrate', 'victory', 'win', 'alive',
    'forever', 'together', 'heart', 'soul', 'magic', 'miracle', 'paradise',
    # Hindi/Urdu positive words (Romanized)
    'pyaar', 'pyar', 'mohabbat', 'ishq', 'khushi', 'khush', 'masti', 'hasna',
    'hansna', 'muskurana', 'madhoshi', 'nasha', 'junoon', 'dil', 'dhadkan',
    'sapna', 'sapne', 'umeed', 'asha', 'vishwas', 'zindagi', 'jindagi', 'azadi',
    'shanti', 'sukoon', 'chain', 'roshni', 'ujala', 'savera', 'subah', 'chandni',
    'jannat', 'firdaus', 'haseen', 'suhana', 'rangeen', 'mastana', 'deewana',
    'badiya', 'achha', 'accha', 'sundar', 'khoobsurat',
    # Devanagari script positive words
    'प्यार', 'मोहब्बत', 'इश्क', 'खुशी', 'खुश', 'मस्ती', 'हंसना', 'मुस्कुराना',
    'दिल', 'धड़कन', 'सपना', 'सपने', 'उम्मीद', 'आशा', 'विश्वास', 'ज़िंदगी',
    'आज़ादी', 'शांति', 'सुकून', 'चैन', 'रोशनी', 'उजाला', 'सवेरा', 'सुबह',
    'चांदनी', 'जन्नत', 'हसीन', 'सुहाना', 'रंगीन', 'मस्ताना', 'दीवाना',
    'सुंदर', 'खूबसूरत', 'अच्छा'
}

NEGATIVE_WORDS = {
    # English negative words
    'hate', 'sad', 'pain', 'hurt', 'broken', 'cry', 'tears', 'alone', 'lonely',
    'dark', 'darkness', 'death', 'die', 'dying', 'lost', 'lose', 'losing', 'fear',
    'scared', 'afraid', 'angry', 'anger', 'rage', 'mad', 'bad', 'wrong', 'fail',
    'failed', 'nothing', 'never', 'gone', 'away', 'leave', 'left', 'goodbye',
    'sorry', 'regret', 'shame', 'guilt', 'hell', 'demon', 'monster', 'nightmare',
    # Hindi/Urdu negative words (Romanized)
    'dard', 'dukh', 'gham', 'udaas', 'udas', 'rona', 'aansoo', 'aansu', 'tanhai',
    'tanha', 'akela', 'akeli', 'judai', 'juda', 'bichadna', 'alvida', 'khatam',
    'tuta', 'toota', 'tutna', 'zakhm', 'zakham', 'dard', 'takleef', 'mushkil',
    'andhere', 'andhera', 'raat', 'bhool', 'nafrat', 'gussa', 'krodh', 'dukhi',
    'pareshan', 'pareshani', 'musibat', 'mushkil', 'afsos', 'sharminda', 'sharam',
    'khali', 'suna', 'viraan', 'barbaad', 'barbadi', 'zulm', 'khatna', 'maut',
    # Devanagari script negative words
    'दर्द', 'दुख', 'ग़म', 'उदास', 'रोना', 'आंसू', 'तन्हाई', 'तन्हा', 'अकेला',
    'अकेली', 'जुदाई', 'जुदा', 'बिछड़ना', 'अलविदा', 'ख़त्म', 'टूटा', 'टूटना',
    'ज़ख़्म', 'तकलीफ़', 'मुश्किल', 'अंधेरा', 'अँधेरे', 'रात', 'भूल', 'नफ़रत',
    'गुस्सा', 'क्रोध', 'दुखी', 'परेशान', 'परेशानी', 'मुसीबत', 'अफ़सोस',
    'शर्मिंदा', 'शर्म', 'ख़ाली', 'सूना', 'वीरान', 'बर्बाद', 'बर्बादी',
    'ज़ुल्म', 'ख़तना', 'मौत'
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
        # Accept words with 2+ chars for Hindi/Urdu (some words are short)
        # Also check if word contains Devanagari or Arabic script
        is_indic_script = any('\u0900' <= c <= '\u097F' or '\u0600' <= c <= '\u06FF' for c in word)
        
        if len(word) > 2 and word not in ALL_STOP_WORDS:
            # For non-Indic scripts, require alphabetic
            if is_indic_script or word.isalpha():
                filtered.append(word)
        # Allow 2-char words for Indic scripts if meaningful
        elif len(word) == 2 and is_indic_script and word not in ALL_STOP_WORDS:
            filtered.append(word)
    
    freq = Counter(filtered)
    
    return dict(freq)


def analyze_sentiment(raw_text):
    """
    Simple sentiment analysis based on word matching.
    Returns sentiment scores and classification.
    """
    if not raw_text:
        return {"score": 0, "label": "neutral", "positive_count": 0, "negative_count": 0}
    
    text = raw_text.lower()
    words = re.findall(r'\b[a-z]+\b', text)
    
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    
    total = positive_count + negative_count
    if total == 0:
        score = 0
        label = "neutral"
    else:
        score = (positive_count - negative_count) / total
        if score > 0.2:
            label = "positive"
        elif score < -0.2:
            label = "negative"
        else:
            label = "neutral"
    
    # Identify dominant emotions
    emotions = []
    if positive_count > negative_count:
        emotions = ["hopeful", "uplifting"]
    elif negative_count > positive_count:
        emotions = ["melancholic", "emotional"]
    else:
        emotions = ["balanced", "reflective"]
    
    return {
        "score": round(score, 2),
        "label": label,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "emotions": emotions
    }
