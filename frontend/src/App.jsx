import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── SVG Icons (no emoji) ────────────────────────────────────────────────────
const Icons = {
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Inbox: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
};

// ─── Small helpers ────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = { sms: ['badge-sms', 'SMS'], email: ['badge-email', 'Email'], call: ['badge-call', 'Call'] };
  const [cls, label] = map[type] || ['badge-sms', type];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function PredBadge({ pred }) {
  if (!pred) return null;
  return <span className={`badge ${pred === 'spam' ? 'badge-spam' : 'badge-ham'}`}>{pred === 'spam' ? 'Spam' : 'Legitimate'}</span>;
}

function AccuracyRing({ value }) {
  const r = 26, circ = 2 * Math.PI * r;
  const dash = circ * (value ?? 0);
  return (
    <div className="accuracy-ring">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#059669" strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div className="accuracy-ring-text">{value != null ? `${(value*100).toFixed(0)}%` : '—'}</div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('detector');
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const navItems = [
    { id: 'detector',  Icon: Icons.Search,   label: 'Detector' },
    { id: 'bulk',      Icon: Icons.Upload,   label: 'Bulk Analysis' },
    { id: 'dashboard', Icon: Icons.BarChart, label: 'Dashboard' },
    { id: 'history',   Icon: Icons.Clock,    label: 'History' },
  ];

  const pageMeta = {
    detector:  { title: 'Message Detector',  sub: 'Classify a single message with AI explainability' },
    bulk:      { title: 'Bulk Analysis',     sub: 'Process an entire CSV file at scale' },
    dashboard: { title: 'Analytics Dashboard', sub: 'Live model performance and classification stats' },
    history:   { title: 'Analysis History',  sub: 'Complete log of every past classification' },
  };

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <div className="brand-icon">
              <Icons.Shield />
            </div>
            <div className="brand-text">
              <div className="brand-name">SpamGuard AI</div>
              <div className="brand-tagline">Enterprise Platform</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(({ id, Icon, label }) => (
            <div
              key={id}
              className={`nav-item${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <span className="nav-icon"><Icon /></span>
              <span className="nav-label">{label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-pill">
            <span className="status-dot" />
            <span className="status-text">Model Active</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">{pageMeta[tab].title}</div>
            <div className="page-subtitle">{pageMeta[tab].sub}</div>
          </div>
          <div className="topbar-right">
            {tab === 'dashboard' && (
              <button className="btn btn-secondary btn-sm" onClick={() => { window.location.href = `${API_BASE}/api/export`; }}>
                <span style={{width:13,height:13,display:'flex'}}><Icons.Download /></span>
                Export CSV
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {tab === 'detector'  && <DetectorTab  showToast={showToast} />}
          {tab === 'bulk'      && <BulkTab      showToast={showToast} />}
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'history'   && <HistoryTab   showToast={showToast} />}
        </div>
      </div>

      {toast && <div className="toast"><span style={{width:14,height:14,display:'flex'}}><Icons.Check /></span> {toast}</div>}
    </div>
  );
}

// ─── Detector ─────────────────────────────────────────────────────────────────
function DetectorTab({ showToast }) {
  const [text, setText] = useState('');
  const [msgType, setMsgType] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setResult(null);
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
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); setStage(''); }
  }

  async function handleFeedback(correction) {
    if (!result?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, correction }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(p => ({ ...p, reported: true }));
        showToast('Feedback saved. Model retrained.');
      }
    } catch (_) {}
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Classify a Message</div>
          <div className="card-subtitle">Paste any SMS, email, or call transcript for instant AI classification</div>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="label">Channel</label>
            <select className="select" value={msgType} onChange={e => setMsgType(e.target.value)}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="call">Call Transcript</option>
            </select>
          </div>
          <div className="form-row">
            <label className="label">Message Content</label>
            <textarea
              className="textarea"
              placeholder="Paste the message content here..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !text.trim()}>
            {loading
              ? <><span className="spinner" />{stage}</>
              : <><span style={{width:14,height:14,display:'flex'}}><Icons.Search /></span>Analyze Message</>}
          </button>
        </form>

        {result && (
          <div className="result-panel">
            <div className={`result-header ${result.label}`}>
              <div className={`verdict ${result.label}`}>
                <span className="verdict-dot" />
                {result.label === 'spam' ? 'Spam Detected' : 'Legitimate Message'}
              </div>
              <div className="confidence-text">{(result.confidence * 100).toFixed(1)}% confidence</div>
            </div>
            <div className="result-body">
              <div>
                <div className="progress-label">
                  <span>Confidence Score</span>
                  <span>{(result.confidence * 100).toFixed(2)}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${result.label}`} style={{ width: `${result.confidence * 100}%` }} />
                </div>
              </div>

              {Array.isArray(result.highlight_words) && result.highlight_words.length > 0 && (
                <div>
                  <div className="section-label">Key Spam Indicators</div>
                  <div className="word-chips">
                    {result.highlight_words.map(w => <span key={w} className="word-chip">{w}</span>)}
                  </div>
                  <div className="muted-note mt-3">
                    These terms contributed most to the spam classification based on logistic regression feature weights.
                  </div>
                </div>
              )}

              <div className="feedback-row">
                {result.reported
                  ? <div className="feedback-success"><span style={{width:14,height:14,display:'flex'}}><Icons.Check /></span>Feedback recorded. Model retrained.</div>
                  : <>
                      <span className="feedback-label">Is this classification incorrect?</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleFeedback(result.label === 'spam' ? 'ham' : 'spam')}>
                        Mark as {result.label === 'spam' ? 'Legitimate' : 'Spam'} + Retrain
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

// ─── Bulk ─────────────────────────────────────────────────────────────────────
function BulkTab({ showToast }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setProgress('Uploading file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      setProgress('Processing rows...');
      const res = await fetch(`${API_BASE}/api/bulk_classify`, { method: 'POST', body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`); }
      setProgress('Preparing download...');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'spamguard_results.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setFile(null);
      document.getElementById('bulk-file-input').value = '';
      showToast('Bulk analysis complete — results downloaded.');
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setLoading(false); setProgress(''); }
  }

  return (
    <div className="col-gap">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Bulk CSV Analysis</div>
            <div className="card-subtitle">Upload a CSV and receive predictions appended to every row</div>
          </div>
        </div>
        <div className="card-body">
          <div className="upload-info">
            <strong>Format Requirements</strong>
            <ul>
              <li>Must include a header row</li>
              <li>Text column should be named <code>text</code>, <code>message</code>, or <code>sms</code></li>
              <li>If not found, the first column is used</li>
              <li>Output appends <code>prediction</code> and <code>confidence</code> columns</li>
            </ul>
          </div>
          <form onSubmit={handleUpload}>
            <div className="form-row">
              <label className="label">CSV File</label>
              <input
                id="bulk-file-input"
                type="file"
                accept=".csv"
                className="file-input"
                onChange={e => setFile(e.target.files[0] || null)}
              />
            </div>
            {file && (
              <div className="text-muted mb-3">
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading || !file}>
              {loading
                ? <><span className="spinner" />{progress}</>
                : <><span style={{width:14,height:14,display:'flex'}}><Icons.Upload /></span>Upload and Analyze</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (_) { setStats(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const spam    = stats?.counts?.spam || 0;
  const ham     = stats?.counts?.ham  || 0;
  const total   = spam + ham;
  const accuracy = stats?.estimated_accuracy ?? null;
  const feedback = stats?.feedback_provided || 0;

  return (
    <div className="col-gap">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Classified</div>
          <div className="stat-value">{loading ? '—' : total.toLocaleString()}</div>
          <div className="stat-desc">All-time messages</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Spam Detected</div>
          <div className="stat-value" style={{color:'var(--danger)'}}>{loading ? '—' : spam.toLocaleString()}</div>
          <div className="stat-desc">{total > 0 ? `${((spam/total)*100).toFixed(1)}% of total` : 'No data'}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Legitimate</div>
          <div className="stat-value" style={{color:'var(--success)'}}>{loading ? '—' : ham.toLocaleString()}</div>
          <div className="stat-desc">{total > 0 ? `${((ham/total)*100).toFixed(1)}% of total` : 'No data'}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">User Corrections</div>
          <div className="stat-value" style={{color:'var(--warning)'}}>{loading ? '—' : feedback}</div>
          <div className="stat-desc">Retraining events</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Classification Distribution</div>
            <div className="card-subtitle">Spam vs. legitimate breakdown across all processed messages</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchStats}>
            <span style={{width:13,height:13,display:'flex'}}><Icons.Refresh /></span>
            Refresh
          </button>
        </div>
        <div className="card-body">
          {loading
            ? <div className="text-muted">Loading statistics...</div>
            : total === 0
              ? <div className="empty-state">
                  <div className="empty-icon" style={{color:'var(--text-3)',display:'flex',justifyContent:'center'}}><Icons.Inbox /></div>
                  <div className="empty-title">No data yet</div>
                  <div className="empty-desc">Classify some messages in the Detector tab to see stats here.</div>
                </div>
              : <>
                  <div className="dist-bar">
                    <div className="dist-spam" style={{width:`${(spam/total)*100}%`}} />
                    <div className="dist-ham"  style={{width:`${(ham/total)*100}%`}}  />
                  </div>
                  <div className="chart-legend mt-3">
                    <div className="legend-item"><div className="legend-dot" style={{background:'var(--danger)'}} />Spam ({spam})</div>
                    <div className="legend-item"><div className="legend-dot" style={{background:'var(--success)'}} />Legitimate ({ham})</div>
                  </div>
                  <div className="accuracy-row">
                    <AccuracyRing value={accuracy} />
                    <div>
                      <div className="accuracy-title">Estimated Model Accuracy</div>
                      <div className="accuracy-desc">
                        {accuracy != null
                          ? `Computed from ${feedback} user correction${feedback !== 1 ? 's' : ''}`
                          : 'Submit corrections from the Detector to compute accuracy'}
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

// ─── History ──────────────────────────────────────────────────────────────────
function HistoryTab({ showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/history?page=${p}&per_page=20`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.pages || 1);
      setPage(p);
    } catch (_) { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Classification Log</div>
          <div className="card-subtitle">Page {page} of {totalPages}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => { window.location.href = `${API_BASE}/api/export`; }}>
            <span style={{width:13,height:13,display:'flex'}}><Icons.Download /></span>Export
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchHistory(page)}>
            <span style={{width:13,height:13,display:'flex'}}><Icons.Refresh /></span>Refresh
          </button>
        </div>
      </div>

      {loading
        ? <div style={{padding:'24px',color:'var(--text-3)',fontSize:'13px'}}>Loading history...</div>
        : items.length === 0
          ? <div className="empty-state">
              <div className="empty-icon" style={{color:'var(--text-3)',display:'flex',justifyContent:'center',marginBottom:12}}><Icons.Inbox /></div>
              <div className="empty-title">No records found</div>
              <div className="empty-desc">Messages you classify will appear here.</div>
            </div>
          : <>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Channel</th>
                    <th>Message</th>
                    <th>Result</th>
                    <th>Confidence</th>
                    <th>Correction</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td style={{color:'var(--text-3)',fontVariantNumeric:'tabular-nums'}}>{item.id}</td>
                      <td><TypeBadge type={item.type} /></td>
                      <td className="message-cell" title={item.text}>{item.text}</td>
                      <td><PredBadge pred={item.prediction} /></td>
                      <td style={{fontVariantNumeric:'tabular-nums',color:'var(--text-2)'}}>
                        {item.confidence != null ? `${(item.confidence*100).toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        {item.user_correction
                          ? <span className="badge badge-corrected">Corrected: {item.user_correction}</span>
                          : <span style={{color:'var(--text-3)'}}>—</span>}
                      </td>
                      <td style={{color:'var(--text-3)',whiteSpace:'nowrap',fontSize:'12px'}}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2" style={{padding:'12px 16px',borderTop:'1px solid var(--border)'}}>
                  <button className="btn btn-secondary btn-sm" onClick={() => fetchHistory(page-1)} disabled={page<=1}>Previous</button>
                  <span style={{fontSize:'12px',color:'var(--text-2)'}}>Page {page} of {totalPages}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => fetchHistory(page+1)} disabled={page>=totalPages}>Next</button>
                </div>
              )}
            </>
      }
    </div>
  );
}
