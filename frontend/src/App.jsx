import { useState, useEffect } from 'react';

// Use environment variable if set (for split deploy), otherwise fallback to same origin (for single deploy)
const API_BASE = import.meta.env.VITE_API_URL || '';

function App() {
  const [activeTab, setActiveTab] = useState('classify'); // 'classify', 'dashboard', 'history'
  
  // Classify State
  const [text, setText] = useState('');
  const [type, setType] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [result, setResult] = useState(null);
  
  // Toast State
  const [toast, setToast] = useState(null);

  // Dashboard State
  const [stats, setStats] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const handleClassify = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setResult(null);
    setAnalysisStage('Extracting features...');
    
    try {
      // Simulate dynamic loading steps for UX
      await delay(600);
      setAnalysisStage('Running Logistic Regression...');
      await delay(600);
      setAnalysisStage('Finalizing results...');
      
      const res = await fetch(`${API_BASE}/api/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text })
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(res.status === 404 ? "Server is starting up or unreachable. Please try again." : "Invalid response from server.");
      }
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      setAnalysisStage('');
    }
  };

  const handleFeedback = async (correction) => {
    if (!result || !result.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, correction })
      });
      if (res.ok) {
        setResult({...result, reported: true});
        showToast("Feedback submitted! Model has been retrained instantly.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history?per_page=10`);
      const data = await res.json();
      setHistory(data.items);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <div className="app-container">
      {toast && <div className="toast fade-in-out">{toast}</div>}
      
      <header>
        <h1>SpamGuard AI</h1>
        <p>Advanced cross-channel spam detection</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'classify' ? 'active' : ''}`}
          onClick={() => setActiveTab('classify')}
        >
          Detector
        </button>
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'classify' && (
        <div className="glass-card fade-in">
          <form onSubmit={handleClassify}>
            <div className="form-group">
              <label>Message Channel</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="call">Call Transcript</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Message Content</label>
              <textarea 
                placeholder="Paste the message here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            
            <button type="submit" disabled={loading || !text.trim()}>
              {loading ? (
                <div className="loading-state">
                  <span className="spinner"></span> {analysisStage}
                </div>
              ) : 'Analyze Message'}
            </button>
          </form>

          {result && (
            <div className="result-section slide-up">
              <div className={`result-badge ${result.label.toLowerCase()}`}>
                {result.label.toUpperCase()}
              </div>
              
              <div>
                <label>Confidence Score: {(result.confidence * 100).toFixed(1)}%</label>
                <div className="confidence-bar-bg">
                  <div 
                    className="confidence-bar-fill" 
                    style={{ 
                      width: `${result.confidence * 100}%`,
                      background: result.label === 'spam' ? '#ef4444' : '#10b981'
                    }}
                  ></div>
                </div>
              </div>

              {!result.reported ? (
                <div className="feedback-area">
                  <span>Is this wrong?</span>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleFeedback(result.label === 'spam' ? 'ham' : 'spam')}
                  >
                    Report as {result.label === 'spam' ? 'Ham' : 'Spam'} & Retrain
                  </button>
                </div>
              ) : (
                <div className="feedback-area" style={{ color: '#10b981' }}>
                  ✓ Feedback integrated into the model.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="glass-card dashboard fade-in">
          <div className="stat-box">
            <div className="stat-label">Total Processed</div>
            <div className="stat-value">
              {stats ? (stats.counts?.spam || 0) + (stats.counts?.ham || 0) : '...'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Spam Detected</div>
            <div className="stat-value" style={{ color: '#fca5a5' }}>
              {stats ? (stats.counts?.spam || 0) : '...'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">User Feedbacks</div>
            <div className="stat-value">
              {stats ? stats.feedback_provided : '...'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Est. Accuracy</div>
            <div className="stat-value" style={{ color: '#6ee7b7' }}>
              {stats && stats.estimated_accuracy !== null 
                ? `${(stats.estimated_accuracy * 100).toFixed(1)}%` 
                : 'N/A'}
            </div>
          </div>
          
          {stats && (stats.counts?.spam > 0 || stats.counts?.ham > 0) && (
            <div className="chart-container">
              <label>Spam vs Ham Ratio</label>
              <div className="chart-bar">
                <div 
                  className="chart-spam" 
                  style={{ width: `${(stats.counts?.spam || 0) / ((stats.counts?.spam || 0) + (stats.counts?.ham || 0)) * 100}%` }}
                >
                  {(stats.counts?.spam || 0) > 0 && 'Spam'}
                </div>
                <div 
                  className="chart-ham" 
                  style={{ width: `${(stats.counts?.ham || 0) / ((stats.counts?.spam || 0) + (stats.counts?.ham || 0)) * 100}%` }}
                >
                  {(stats.counts?.ham || 0) > 0 && 'Ham'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-card history-container fade-in">
          <h2>Recent Analyses</h2>
          {history.length === 0 ? (
            <p className="empty-state">No recent activity found.</p>
          ) : (
            <div className="history-list">
              {history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-header">
                    <span className="history-type">{item.type.toUpperCase()}</span>
                    <span className="history-date">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="history-text">"{item.text.length > 80 ? item.text.substring(0,80) + '...' : item.text}"</div>
                  <div className="history-footer">
                    Prediction: 
                    <span className={`badge ${item.prediction === 'spam' ? 'spam-badge' : 'ham-badge'}`}>
                      {item.prediction.toUpperCase()}
                    </span>
                    {item.user_correction && (
                      <span className="correction-badge">
                        → Corrected to {item.user_correction.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
