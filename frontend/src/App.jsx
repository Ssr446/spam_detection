import { useState, useEffect } from 'react';

// Use environment variable if set (for split deploy), otherwise fallback to same origin (for single deploy)
const API_BASE = import.meta.env.VITE_API_URL || '';

function App() {
  const [activeTab, setActiveTab] = useState('classify'); // 'classify' or 'dashboard'
  
  // Classify State
  const [text, setText] = useState('');
  const [type, setType] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Dashboard State
  const [stats, setStats] = useState(null);

  const handleClassify = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setResult(null);
    setFeedbackGiven(false);
    
    try {
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
        setFeedbackGiven(true);
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

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    }
  }, [activeTab]);

  return (
    <div className="app-container">
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
      </div>

      {activeTab === 'classify' && (
        <div className="glass-card">
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
              {loading ? 'Analyzing...' : 'Analyze Message'}
            </button>
          </form>

          {result && (
            <div className="result-section">
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

              {!feedbackGiven ? (
                <div className="feedback-area">
                  <span>Is this wrong?</span>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleFeedback(result.label === 'spam' ? 'ham' : 'spam')}
                  >
                    Report as {result.label === 'spam' ? 'Ham' : 'Spam'}
                  </button>
                </div>
              ) : (
                <div className="feedback-area" style={{ color: '#10b981' }}>
                  ✓ Feedback submitted. Thank you!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="glass-card dashboard">
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
        </div>
      )}
    </div>
  );
}

export default App;
