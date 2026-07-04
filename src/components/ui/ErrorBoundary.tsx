import React from 'react'

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Got Netty render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3rem', color: '#ff2c91', marginBottom: '1rem' }}>
            Something went wrong
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', maxWidth: '400px' }}>
            Please refresh the page. If the problem persists, contact hello@gotnetty.com.au
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ background: '#ff2c91', color: '#fff', border: 'none', borderRadius: '9999px', padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
