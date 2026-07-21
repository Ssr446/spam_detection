import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function App() {
  const [activeTab, setActiveTab] = useState('classify'); // 'classify', 'dashboard', 'history', 'bulk'
  
  // Classify State
  const [text, setText] = useState('');
  const [type, setType] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [result, setResult] = useState(null);
  
  // Bulk State
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  
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
      await delay(400);
      setAnalysisStage('Running Logistic Regression...');
      await delay(400);
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

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setBulkLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/api/bulk_classify`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      
      // Handle file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_results.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      showToast("Bulk analysis complete! File downloaded.");
      setFile(null);
      // reset file input visually
      document.getElementById('file-upload').value = '';
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBulkLoading(false);
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
        showToast("Feedback submitted! Model retrained.");
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
      const res = await fetch(`${API_BASE}/api/history?per_page=15`);
      const data = await res.json();
      setHistory(data.items);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };
  
  const handleExport = () => {
    window.location.href = `${API_BASE}/api/export`;
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats();
    else if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  return (
    <div className="app-container">
      {toast && <div className="toast">{toast}</div>}
      
      <header>
        <h1>SpamGuard AI Enterprise</h1>
        <p>Production-grade spam classification and analysis platform</p>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'classify' ? 'active' : ''}`} onClick={() => setActiveTab('classify')}>Detector</button>
        <button className={`tab ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>Bulk Analysis</button>
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
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
                placeholder="Paste the message text here for analysis..."
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
            <div className="result-section">
              <div className="flex-between">
                <div className={`result-badge ${result.label.toLowerCase()}`}>
                  {result.label.toUpperCase()}
                </div>
                <div style={{fontWeight: 600}}>
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="confidence-bar-bg">
                <div 
                  className="confidence-bar-fill" 
                  style={{ 
                    width: `${result.confidence * 100}%`,
                    background: result.label === 'spam' ? '#dc2626' : '#16a34a'
                  }}
                ></div>
              </div>

              {result.highlight_words && result.highlight_words.length > 0 && (
                <div className="mt-4">
                  <label>Explainability: Key Factors</label>
                  <p className="explanation-text">The model flagged the following words as highly indicative of {result.label}:</p>
                  <div className="highlighted-sentence">
                    {result.highlight_words.map(w => (
                      <span key={w} className="highlight-word">{w}</span>
                    ))}
                  </div>
                </div>
              )}

              {!result.reported ? (
                <div className="feedback-area">
                  <span style={{fontSize: '0.875rem', fontWeight: 500}}>Is this classification incorrect?</span>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleFeedback(result.label === 'spam' ? 'ham' : 'spam')}
                  >
                    Report as {result.label === 'spam' ? 'Ham' : 'Spam'} & Retrain Model
                  </button>
                </div>
              ) : (
                <div className="feedback-area" style={{ color: '#16a34a', fontWeight: 500, fontSize: '0.9rem' }}>
                  ✓ Feedback integrated. The model has been retrained.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="glass-card">
          <h2 style={{marginBottom: '1rem', fontSize: '1.25rem'}}>Bulk CSV Analysis</h2>
          <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
            Upload a CSV file containing messages. The system will automatically detect the text column, process all rows, and return a downloadable CSV with the predictions appended.
          </p>
          <form onSubmit={handleBulkUpload}>
            <div className="form-group">
              <label>Select CSV File</label>
              <input 
                id="file-upload"
                type="file" 
                accept=".csv" 
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
            <button type="submit" disabled={bulkLoading || !file}>
              {bulkLoading ? (
                <div className="loading-state">
                  <span className="spinner"></span> Processing File...
                </div>
              ) : 'Upload and Analyze'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="glass-card">
          <div className="flex-between mb-4">
            <h2 style={{fontSize: '1.25rem'}}>System Metrics</h2>
            <button className="btn-secondary" onClick={handleExport}>
              Export Data (CSV)
            </button>
          </div>
          
          <div className="dashboard">
            <div className="stat-box">
              <div className="stat-label">Total Processed</div>
              <div className="stat-value">
                {stats ? (stats.counts?.spam || 0) + (stats.counts?.ham || 0) : '...'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Spam Detected</div>
              <div className="stat-value" style={{ color: '#dc2626' }}>
                {stats ? (stats.counts?.spam || 0) : '...'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">User Corrections</div>
              <div className="stat-value">
                {stats ? stats.feedback_provided : '...'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Est. Accuracy</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>
                {stats && stats.estimated_accuracy !== null 
                  ? `${(stats.estimated_accuracy * 100).toFixed(1)}%` 
                  : 'N/A'}
              </div>
            </div>
          </div>
          
          {stats && (stats.counts?.spam > 0 || stats.counts?.ham > 0) && (
            <div className="mt-4 pt-4" style={{borderTop: '1px solid var(--border-color)'}}>
              <label style={{marginBottom: '0.5rem', display: 'block'}}>Spam vs Ham Distribution</label>
              <div className="chart-bar" style={{display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden'}}>
                <div 
                  style={{ 
                    width: `${(stats.counts?.spam || 0) / ((stats.counts?.spam || 0) + (stats.counts?.ham || 0)) * 100}%`,
                    background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600
                  }}
                >
                  {(stats.counts?.spam || 0) > 0 && 'SPAM'}
                </div>
                <div 
                  style={{ 
                    width: `${(stats.counts?.ham || 0) / ((stats.counts?.spam || 0) + (stats.counts?.ham || 0)) * 100}%`,
                    background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600
                  }}
                >
                  {(stats.counts?.ham || 0) > 0 && 'HAM'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-card history-container">
          <div className="flex-between mb-4">
            <h2 style={{fontSize: '1.25rem'}}>Analysis Log</h2>
          </div>
          {history.length === 0 ? (
            <p style={{color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center'}}>No historical records found.</p>
          ) : (
            <div className="history-list">
              {history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-header">
                    <span style={{fontWeight: 600, color: 'var(--text-main)'}}>{item.type.toUpperCase()}</span>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="history-text">{item.text.length > 120 ? item.text.substring(0,120) + '...' : item.text}</div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    Result: 
                    <span className={`badge ${item.prediction === 'spam' ? 'spam-badge' : 'ham-badge'}`}>
                      {item.prediction.toUpperCase()}
                    </span>
                    {item.user_correction && (
                      <span className="badge correction-badge">
                        OVERRIDDEN TO {item.user_correction.toUpperCase()}
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
