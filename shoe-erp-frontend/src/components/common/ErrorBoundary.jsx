import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center border-t-4 border-red-500">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-6">A critical component failed to render. Our team has been notified. Please try reloading the application.</p>
            
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary px-8 py-3 w-full mb-4"
            >
              Reload Sandbox
            </button>
            
            {process.env.NODE_ENV === 'development' && (
               <details className="text-left bg-gray-100 p-4 rounded text-xs overflow-auto max-h-40">
                 <summary className="font-bold text-gray-700 cursor-pointer">View Stack Trace</summary>
                 <pre className="mt-2 text-red-600">{this.state.error?.toString()}</pre>
                 <pre className="mt-2 text-gray-600">{this.state.errorInfo?.componentStack}</pre>
               </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
