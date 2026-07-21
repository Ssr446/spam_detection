import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: '#f8fafc',
          color: '#0f172a', padding: '24px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Application Error</h1>
          <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
            {this.state.error?.message || 'Something went wrong.'}
          </p>
          <button
            style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
