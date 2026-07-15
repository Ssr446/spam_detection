import os
import sqlite3
import joblib
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Make sure to import ml_pipeline so unpickling works
import ml_pipeline

app = Flask(__name__, static_folder='static')
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'spam_db.sqlite')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'spam_classifier.pkl')

model = None

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
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

@app.route('/api/classify', methods=['POST'])
def classify():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
        
    data = request.json
    msg_type = data.get('type', 'sms')
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
        
    # Predict
    try:
        prediction = model.predict([text])[0]
        probabilities = model.predict_proba([text])[0]
        # model.classes_ usually ['ham', 'spam']
        # we need to find the index of the predicted class
        class_idx = list(model.classes_).index(prediction)
        confidence = float(probabilities[class_idx])
        
        # Save to DB
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
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
            'confidence': confidence
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def feedback():
    data = request.json
    item_id = data.get('id')
    correction = data.get('correction')
    
    if not item_id or not correction:
        return jsonify({'error': 'ID and correction are required'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('UPDATE history SET user_correction = ? WHERE id = ?', (correction, item_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def history():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    offset = (page - 1) * per_page
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Counts
    c.execute('SELECT prediction, COUNT(*) FROM history GROUP BY prediction')
    counts = dict(c.fetchall())
    
    # Accuracy from feedback
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

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
