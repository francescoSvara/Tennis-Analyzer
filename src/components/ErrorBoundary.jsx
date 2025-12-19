import React from 'react';

/**
 * ErrorBoundary - Catches errors in child components and displays fallback UI
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback, componentName = 'Componente' } = this.props;

      if (fallback) {
        return fallback;
      }

      return (
        <div style={{
          padding: 16,
          background: '#2d1a1a',
          border: '1px solid #c62828',
          borderRadius: 8,
          margin: '12px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <h3 style={{ margin: 0, color: '#ef5350' }}>
              Errore in {componentName}
            </h3>
          </div>
          
          <p style={{ color: '#ffcdd2', marginBottom: 12 }}>
            Si è verificato un errore durante il rendering. Questo potrebbe essere causato da dati malformati o un problema temporaneo.
          </p>

          {this.state.error && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#ef9a9a' }}>
                Dettagli errore
              </summary>
              <pre style={{
                background: '#1a1a1a',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                fontSize: 12,
                color: '#ff8a80',
                marginTop: 8
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 16px',
              background: '#c62828',
              border: 'none',
              borderRadius: 4,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            🔄 Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
