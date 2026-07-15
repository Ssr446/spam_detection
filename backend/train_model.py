import os
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix, classification_report
from ml_pipeline import TextPreprocessor

def train(extra_X=None, extra_y=None):
    print("Loading dataset...")
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'spam_sample.csv')
    df = pd.read_csv(data_path)
    
    # We only need text and label for training
    X = df['text']
    y = df['label']
    
    if extra_X is not None and extra_y is not None:
        X = pd.concat([X, pd.Series(extra_X)], ignore_index=True)
        y = pd.concat([y, pd.Series(extra_y)], ignore_index=True)
        print(f"Appended {len(extra_X)} additional feedback samples.")
        
    print(f"Dataset loaded. Total samples: {len(X)}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Building pipeline...")
    pipeline = Pipeline([
        ('preprocessor', TextPreprocessor()),
        ('vectorizer', TfidfVectorizer()),
        ('classifier', LogisticRegression(random_state=42))
    ])
    
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, pos_label='spam', zero_division=0)
    rec = recall_score(y_test, y_pred, pos_label='spam', zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(y_test, y_pred, zero_division=0)
    
    print(f"Accuracy: {acc:.4f}")
    
    # Save evaluation report
    report_path = os.path.join(os.path.dirname(__file__), 'model', 'evaluation_report.txt')
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        f.write("Model Evaluation Report\n")
        f.write("========================\n\n")
        f.write(f"Accuracy:  {acc:.4f}\n")
        f.write(f"Precision: {prec:.4f}\n")
        f.write(f"Recall:    {rec:.4f}\n\n")
        f.write("Confusion Matrix:\n")
        f.write(f"{cm}\n\n")
        f.write("Classification Report:\n")
        f.write(report)
        
    print(f"Evaluation report saved to {report_path}")
    
    # Save the model pipeline
    model_path = os.path.join(os.path.dirname(__file__), 'model', 'spam_classifier.pkl')
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(pipeline, model_path)
    print(f"Model saved to {model_path}")
    
    return pipeline

if __name__ == "__main__":
    train()
