import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Small helpers ────────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function TypeBadge({ type }) {
  const cls = { sms: 'badge-sms', email: 'badge-email', call: 'badge-call' }[type] || 'badge-sms';
  const label = { sms: '📱 SMS', email: '✉️ Email', call: '📞 Call' }[type] || type;
  return <span className={`badge ${cls}`}>{label}</span>;
}

function PredBadge({ pred }) {
  if (!pred) return null;
  return <span className={`badge ${pred === 'spam' ? 'badge-spam' : 'badge-ham'}`}>{pred.toUpperCase()}</span>;
}

function AccuracyRing({ value }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const pct = value != null ? value : 0;
  const dash = circ * pct;
  return (
    <div className="accuracy-ring">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#16a34a" strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="accuracy-ring-text">{value != null ? `${(value * 100).toFixed(0)}%` : '—'}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('detector');
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const navItems = [
    { id: 'detector', icon: '🔍', label: 'Detector' },
    { id: 'bulk',     icon: '📊', label: 'Bulk Analysis' },
    { id: 'dashboard', icon: '📈', label: 'Dashboard' },
    { id: 'history',  icon: '🗂️',  label: 'History' },
  ];

  const pageMeta = {
    detector:  { title: 'Message Detector',  subtitle: 'Classify a single message in real time' },
    bulk:      { title: 'Bulk Analysis',     subtitle: 'Process a CSV file of messages at scale' },
    dashboard: { title: 'Dashboard',         subtitle: 'Live statistics and model performance' },
    history:   { title: 'Analysis History',  subtitle: 'Full log of past classifications' },
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <div className="brand-icon">🛡️</div>
            <div className="brand-name">SpamGuard AI</div>
          </div>
          <div className="brand-tagline">Enterprise Detection Platform</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Analysis</div>
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="model-badge"><span>Model Online</span></span>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">{pageMeta[tab].title}</div>
            <div className="page-subtitle">{pageMeta[tab].subtitle}</div>
          </div>
          {tab === 'dashboard' && (
            <div className="topbar-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `${API_BASE}/api/export`}>
                ⬇ Export CSV
              </button>
            </div>
          )}
        </div>

        <div className="content">
          {tab === 'detector'  && <DetectorTab  showToast={showToast} />}
          {tab === 'bulk'      && <BulkTab      showToast={showToast} />}
          {tab === 'dashboard' && <DashboardTab showToast={showToast} />}
          {tab === 'history'   && <HistoryTab   showToast={showToast} />}
        </div>
      </div>

      {toast && (
        <div className="toast">✓ {toast}</div>
      )}
    </div>
  );
}

// ─── Detector Tab ─────────────────────────────────────────────────────────────

function DetectorTab({ showToast }) {
  const [text, setText] = useState('');
  const [msgType, setMsgType] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setResult(null);
    setStage('Tokenising input...');
    await delay(350);
    setStage('Extracting TF-IDF features...');
    await delay(350);
    setStage('Running logistic regression...');

    try {
      const res = await fetch(`${API_BASE}/api/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: msgType, text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      alert('Classification error: ' + err.message);
    } finally {
      setLoading(false);
      setStage('');
    }
  }

  async function handleFeedback(correction) {
    if (!result || !result.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, correction }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(prev => ({ ...prev, reported: true }));
        showToast('Feedback saved. Model retrained instantly.');
      }
    } catch (_) {}
  }

  const label = result ? result.label : null;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Classify a Message</div>
          <div className="card-subtitle">Paste any message to detect spam with model-level explainability</div>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="label">Message Channel</label>
            <select className="select" value={msgType} onChange={e => setMsgType(e.target.value)}>
              <option value="sms">📱 SMS</option>
              <option value="email">✉️ Email</option>
              <option value="call">📞 Call Transcript</option>
            </select>
          </div>

          <div className="form-row">
            <label className="label">Message Content</label>
            <textarea
              className="textarea"
              placeholder="Paste the message content here for analysis..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !text.trim()}>
            {loading
              ? <><span className="spinner" /> {stage}</>
              : <><span>🔍</span> Analyze Message</>
            }
          </button>
        </form>

        {result && (
          <div className="result-panel">
            <div className={`result-header ${label}`}>
              <div className={`verdict ${label}`}>
                <span className="verdict-icon">{label === 'spam' ? '🚨' : '✅'}</span>
                {label === 'spam' ? 'Spam Detected' : 'Legitimate Message'}
              </div>
              <div className="confidence-text">
                {(result.confidence * 100).toFixed(1)}% confidence
              </div>
            </div>

            <div className="result-body">
              <div className="progress-wrap">
                <div className="progress-label">
                  <span>Confidence Score</span>
                  <span>{(result.confidence * 100).toFixed(2)}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${label}`}
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>

              {Array.isArray(result.highlight_words) && result.highlight_words.length > 0 && (
                <div>
                  <div className="section-label">🔎 Explainability — Key Spam Indicators</div>
                  <div className="word-chips">
                    {result.highlight_words.map(w => (
                      <span key={w} className="word-chip">{w}</span>
                    ))}
                  </div>
                  <div className="text-muted mt-4">
                    These words contributed most to the spam prediction based on logistic regression feature weights.
                  </div>
                </div>
              )}

              <div className="feedback-row">
                {result.reported
                  ? <div className="feedback-success">✓ Feedback recorded — model has been retrained.</div>
                  : <>
                      <span className="feedback-label">Is this classification incorrect?</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleFeedback(label === 'spam' ? 'ham' : 'spam')}
                      >
                        Mark as {label === 'spam' ? 'Legitimate' : 'Spam'} {String.fromCharCode(38)} Retrain
                      </button>
                    </>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bulk Tab ─────────────────────────────────────────────────────────────────

function BulkTab({ showToast }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setProgress('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress('Processing rows...');
      const res = await fetch(`${API_BASE}/api/bulk_classify`, { method: 'POST', body: formData });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      setProgress('Preparing download...');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spamguard_results.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setFile(null);
      document.getElementById('bulk-file-input').value = '';
      showToast('Bulk analysis complete — results downloaded.');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Bulk CSV Analysis</div>
            <div className="card-subtitle">Upload a CSV, get a CSV back with predictions appended per row</div>
          </div>
        </div>
        <div className="card-body">
          <div className="upload-info mb-4">
            <strong>CSV Format Requirements:</strong>
            <ul>
              <li>Must have a header row</li>
              <li>Text column should be named <code>text</code>, <code>message</code>, or <code>sms</code></li>
              <li>If not found, the first column will be used</li>
              <li>Output adds <code>prediction</code> and <code>confidence</code> columns</li>
            </ul>
          </div>

          <form onSubmit={handleUpload}>
            <div className="form-row">
              <label className="label">Select CSV File</label>
              <input
                id="bulk-file-input"
                type="file"
                accept=".csv"
                className="file-input"
                onChange={e => setFile(e.target.files[0] || null)}
              />
            </div>

            {file && (
              <div className="text-muted mb-4">
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading || !file}>
              {loading
                ? <><span className="spinner" /> {progress}</>
                : <><span>📊</span> Upload {String.fromCharCode(38)} Analyze</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (_) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totalSpam = stats?.counts?.spam || 0;
  const totalHam  = stats?.counts?.ham  || 0;
  const total     = totalSpam + totalHam;
  const accuracy  = stats?.estimated_accuracy ?? null;
  const feedback  = stats?.feedback_provided || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Classified</div>
          <div className="stat-value">{loading ? '…' : total.toLocaleString()}</div>
          <div className="stat-desc">All time messages analysed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spam Detected</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{loading ? '…' : totalSpam.toLocaleString()}</div>
          <div className="stat-desc">{total > 0 ? `${((totalSpam/total)*100).toFixed(1)}% of total` : 'No data yet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Legitimate</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{loading ? '…' : totalHam.toLocaleString()}</div>
          <div className="stat-desc">{total > 0 ? `${((totalHam/total)*100).toFixed(1)}% of total` : 'No data yet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">User Corrections</div>
          <div className="stat-value">{loading ? '…' : feedback}</div>
          <div className="stat-desc">Model retraining events</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Spam vs Legitimate Distribution</div>
            <div className="card-subtitle">Breakdown of all classified messages</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStats}>↻ Refresh</button>
        </div>
        <div className="card-body">
          {loading
            ? <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading…</div>
            : total === 0
              ? <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No data yet</div>
                  <div className="empty-desc">Classify some messages to see your stats here.</div>
                </div>
              : <>
                  <div className="dist-bar">
                    <div className="dist-spam" style={{ width: `${(totalSpam/total)*100}%` }} />
                    <div className="dist-ham"  style={{ width: `${(totalHam/total)*100}%`  }} />
                  </div>
                  <div className="chart-legend">
                    <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--danger)' }} /> Spam ({totalSpam})</div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }} /> Legitimate ({totalHam})</div>
                  </div>

                  <div className="accuracy-row">
                    <AccuracyRing value={accuracy} />
                    <div className="accuracy-info">
                      <div className="accuracy-title">Estimated Accuracy</div>
                      <div className="accuracy-desc">
                        {accuracy != null
                          ? `Based on ${feedback} user correction${feedback === 1 ? '' : 's'}`
                          : 'Submit feedback corrections to compute accuracy'
                        }
                      </div>
                    </div>
                  </div>
                </>
          }
        </div>
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/history?page=${p}&per_page=20`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.pages || 1);
      setPage(p);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Classification Log</div>
          <div className="card-subtitle">Full history of every message analysed — page {page} of {totalPages}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `${API_BASE}/api/export`}>⬇ Export</button>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchHistory(page)}>↻ Refresh</button>
        </div>
      </div>

      {loading
        ? <div style={{ padding: '24px', color: 'var(--text-3)', fontSize: '13px' }}>Loading…</div>
        : items.length === 0
          ? <div className="empty-state">
              <div className="empty-icon">🗂️</div>
              <div className="empty-title">No history yet</div>
              <div className="empty-desc">Messages you classify will appear here.</div>
            </div>
          : <>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Channel</th>
                    <th>Message</th>
                    <th>Result</th>
                    <th>Confidence</th>
                    <th>Correction</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{item.id}</td>
                      <td><TypeBadge type={item.type} /></td>
                      <td className="message-cell" title={item.text}>{item.text}</td>
                      <td><PredBadge pred={item.prediction} /></td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>
                        {item.confidence != null ? `${(item.confidence * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        {item.user_correction
                          ? <span className="badge badge-corrected">→ {item.user_correction.toUpperCase()}</span>
                          : <span style={{ color: 'var(--text-3)' }}>—</span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center gap-2 justify-between" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => fetchHistory(page - 1)} disabled={page <= 1}>← Prev</button>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>Page {page} of {totalPages}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => fetchHistory(page + 1)} disabled={page >= totalPages}>Next →</button>
                </div>
              )}
            </>
      }
    </div>
  );
}
