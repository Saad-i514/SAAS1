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
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 text-center animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-gray-100">
            <div className="text-rose-500 mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6">An unexpected error occurred in the application. Please try reloading the page.</p>
            <button 
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl transition-all shadow-md font-medium"
            >
                Reload Application
            </button>
            {this.state.error && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left overflow-auto text-xs font-mono text-gray-600 max-h-40">
                    {this.state.error.toString()}
                </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
