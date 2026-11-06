import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SmartClass ErrorBoundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          color: '#f87171', 
          backgroundColor: '#070a12', 
          minHeight: '100vh', 
          fontFamily: 'Inter, system-ui, sans-serif' 
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', background: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #ef4444' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Runtime Error Encountered</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>The application encountered an unexpected runtime error:</p>
            <pre style={{ 
              backgroundColor: '#020617', 
              padding: '12px', 
              borderRadius: '8px', 
              color: '#fca5a5', 
              fontSize: '12px', 
              overflowX: 'auto',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ 
                marginTop: '16px', 
                padding: '8px 16px', 
                backgroundColor: '#06b6d4', 
                color: '#070a12', 
                fontWeight: '600', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer' 
              }}>
              Reset Cache & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
