// src/components/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#FF3B30', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '20px', color: '#B0B0B0' }}>
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#00C853',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#FF3B30' }}>
                Error Details (Development)
              </summary>
              <pre style={{
                backgroundColor: '#1A1A1A',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                marginTop: '10px',
                fontSize: '12px'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
