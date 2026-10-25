import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#f0f0f0',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '48px 24px',
          maxWidth: 720,
          margin: '0 auto',
        }}>
          <p style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: '#d4663a',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            [ SOMETHING BROKE ]
          </p>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}>
            Uncaught error.
          </h1>
          <p style={{ color: '#888', marginBottom: 24 }}>
            {this.state.error?.message || 'Unknown error.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#f0f0f0',
              color: '#0a0a0a',
              border: '1px solid #f0f0f0',
              padding: '12px 20px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            RELOAD PAGE →
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}