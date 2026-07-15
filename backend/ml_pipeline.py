import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# Ensure NLTK datasets are downloaded
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

class TextPreprocessor:
    def __init__(self):
        self.stemmer = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))

    def preprocess(self, text):
        """
        Preprocesses text by:
        1. Lowercasing
        2. Removing non-alphanumeric characters
        3. Tokenization (basic split)
        4. Removing stopwords
        5. Stemming
        """
        if not isinstance(text, str):
            return ""
            
        # 1. Lowercase
        text = text.lower()
        
        # 2. Remove special characters and numbers (keep only letters)
        text = re.sub(r'[^a-z\s]', '', text)
        
        # 3. Tokenize
        tokens = text.split()
        
        # 4 & 5. Remove stopwords and stem
        processed_tokens = [
            self.stemmer.stem(word) 
            for word in tokens 
            if word not in self.stop_words
        ]
        
        return " ".join(processed_tokens)

    def fit(self, X, y=None):
        return self

    def transform(self, X, y=None):
        return [self.preprocess(text) for text in X]
