import os
import sqlite3
import joblib
import pandas as pd
import io
import csv
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from datetime import datetime

# Import ml_pipeline so unpickling works
import ml_pipeline
from train_model import train

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app)

DATABASE_URL = os.environ.get('DATABASE_URL')
DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'spam_db.sqlite')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'spam_classifier.pkl')

model = None

def get_db_connection():
    if DATABASE_URL:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(DATABASE_URL)
        return conn, 'postgres'
    else:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn, 'sqlite'

def init_db():
    conn, db_type = get_db_connection()
    c = conn.cursor()
    if db_type == 'postgres':
        c.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id SERIAL PRIMARY KEY,
                type TEXT,
                text TEXT,
                prediction TEXT,
                confidence REAL,
                user_correction TEXT,
                timestamp TIMESTAMP
            )
        ''')
    else:
        c.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                text TEXT,
                prediction TEXT,
                confidence REAL,
                user_correction TEXT,
                timestamp DATETIME
            )
        ''')
    conn.commit()
    conn.close()

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")

init_db()
load_model()

def get_top_features(text, prediction):
    if not model:
        return []
    try:
        vectorizer = model.named_steps['vectorizer']
        classifier = model.named_steps['classifier']
        
        # Transform the single text
        X = vectorizer.transform([text])
        feature_names = vectorizer.get_feature_names_out()
        
        # Get non-zero indices for this text
        indices = X.nonzero()[1]
        
        # Get weights for this class
        # if binary, classifier.coef_ has shape (1, n_features)
        class_idx = list(classifier.classes_).index(prediction)
        
        word_weights = []
        for idx in indices:
            # For binary classification, class 1 is index 1, class 0 is index 0
            if len(classifier.classes_) == 2:
                weight = classifier.coef_[0][idx]
                if class_idx == 0:
                    weight = -weight
            else:
                weight = classifier.coef_[class_idx][idx]
                
            word_weights.append({
                'word': feature_names[idx],
                'weight': float(weight)
            })
            
        # Sort by highest weight contribution to this class
        word_weights.sort(key=lambda x: x['weight'], reverse=True)
        return [w['word'] for w in word_weights[:5] if w['weight'] > 0]
    except Exception as e:
        print("Error getting features:", e)
        return []

@app.route('/api/classify', methods=['POST'])
def classify():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
        
    data = request.json
    msg_type = data.get('type', 'sms')
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
        
    try:
        prediction = model.predict([text])[0]
        probabilities = model.predict_proba([text])[0]
        class_idx = list(model.classes_).index(prediction)
        confidence = float(probabilities[class_idx])
        
        highlight_words = get_top_features(text, prediction)
        
        conn, db_type = get_db_connection()
        c = conn.cursor()
        if db_type == 'postgres':
            c.execute('''
                INSERT INTO history (type, text, prediction, confidence, timestamp)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            ''', (msg_type, text, prediction, confidence, datetime.utcnow()))
            last_id = c.fetchone()[0]
        else:
            c.execute('''
                INSERT INTO history (type, text, prediction, confidence, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (msg_type, text, prediction, confidence, datetime.utcnow()))
            last_id = c.lastrowid
            
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': last_id,
            'label': prediction,
            'confidence': confidence,
            'highlight_words': highlight_words
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bulk_classify', methods=['POST'])
def bulk_classify():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.reader(stream)
        
        output = io.StringIO()
        csv_writer = csv.writer(output)
        
        header = next(csv_input)
        csv_writer.writerow(header + ['prediction', 'confidence'])
        
        # Find the text column (assume 'text', 'message', or first column)
        text_idx = 0
        for i, col in enumerate(header):
            if col.lower() in ['text', 'message', 'sms']:
                text_idx = i
                break
                
        for row in csv_input:
            if not row or len(row) <= text_idx:
                continue
            text = row[text_idx]
            if text.strip():
                prediction = model.predict([text])[0]
                probabilities = model.predict_proba([text])[0]
                class_idx = list(model.classes_).index(prediction)
                confidence = float(probabilities[class_idx])
                csv_writer.writerow(row + [prediction, round(confidence, 4)])
            else:
                csv_writer.writerow(row + ['', ''])
                
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=bulk_results.csv"}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def feedback():
    global model
    data = request.json
    item_id = data.get('id')
    correction = data.get('correction')
    
    if not item_id or not correction:
        return jsonify({'error': 'ID and correction are required'}), 400
        
    try:
        conn, db_type = get_db_connection()
        c = conn.cursor()
        
        if db_type == 'postgres':
            c.execute('UPDATE history SET user_correction = %s WHERE id = %s', (correction, item_id))
        else:
            c.execute('UPDATE history SET user_correction = ? WHERE id = ?', (correction, item_id))
            
        conn.commit()
        
        c.execute('SELECT text, user_correction FROM history WHERE user_correction IS NOT NULL')
        corrections = c.fetchall()
        conn.close()
        
        if corrections:
            extra_X = [row[0] if type(row) is tuple else row['text'] for row in corrections]
            extra_y = [row[1] if type(row) is tuple else row['user_correction'] for row in corrections]
            print(f"Retraining model with {len(extra_X)} user corrections...")
            model = train(extra_X, extra_y)
            print("Model retrained successfully.")
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def history():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    offset = (page - 1) * per_page
    
    conn, db_type = get_db_connection()
    
    if db_type == 'postgres':
        import psycopg2.extras
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT %s OFFSET %s', (per_page, offset))
        rows = c.fetchall()
        c.execute('SELECT COUNT(*) FROM history')
        total = c.fetchone()['count']
    else:
        c = conn.cursor()
        c.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT ? OFFSET ?', (per_page, offset))
        rows = [dict(row) for row in c.fetchall()]
        c.execute('SELECT COUNT(*) FROM history')
        total = c.fetchone()[0]
        
    conn.close()
    
    return jsonify({
        'items': rows,
        'total': total,
        'page': page,
        'pages': (total + per_page - 1) // per_page
    })

@app.route('/api/stats', methods=['GET'])
def stats():
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    c.execute('SELECT prediction, COUNT(*) FROM history GROUP BY prediction')
    counts_raw = c.fetchall()
    counts = {row[0]: row[1] if type(row) is tuple else row['COUNT(*)'] for row in counts_raw}
    if db_type == 'postgres':
        counts = {row[0]: row[1] for row in counts_raw} # psycopg2 dict cursors not used here
    
    c.execute('SELECT COUNT(*) FROM history WHERE user_correction IS NOT NULL')
    total_feedback = c.fetchone()[0]
    
    correct_count = 0
    if total_feedback > 0:
        c.execute('''
            SELECT COUNT(*) FROM history 
            WHERE user_correction IS NOT NULL 
            AND prediction = user_correction
        ''')
        correct_count = c.fetchone()[0]
        
    conn.close()
    
    accuracy = (correct_count / total_feedback) if total_feedback > 0 else None
    
    return jsonify({
        'counts': counts,
        'feedback_provided': total_feedback,
        'estimated_accuracy': accuracy
    })

@app.route('/api/export', methods=['GET'])
def export_history():
    conn, db_type = get_db_connection()
    if db_type == 'postgres':
        import psycopg2.extras
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        c = conn.cursor()
        
    c.execute('SELECT * FROM history ORDER BY timestamp DESC')
    rows = c.fetchall()
    conn.close()
    
    output = io.StringIO()
    if rows:
        keys = dict(rows[0]).keys()
        dict_writer = csv.DictWriter(output, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows([dict(r) for r in rows])
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=spamguard_history.csv"}
    )

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Never catch API routes
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    # Serve the file if it exists in the static folder
    file_path = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(STATIC_DIR, path)
    # Fall back to index.html for SPA routing
    return send_from_directory(STATIC_DIR, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
