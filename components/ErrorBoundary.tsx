import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

interface ErrorInfo {
  error: Error | null;
  errorInfo: string | null;
}

const ErrorBoundary: React.FC<Props> = ({ children }) => {
  const [errorInfo, setErrorInfo] = useState<ErrorInfo>({ error: null, errorInfo: null });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Error caught:', event.error);
      setErrorInfo({
        error: event.error,
        errorInfo: event.error?.stack || 'No stack trace available'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      setErrorInfo({
        error: new Error(event.reason),
        errorInfo: 'Promise rejection: ' + String(event.reason)
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (errorInfo.error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-xl font-bold text-red-600 mb-4">
            🚨 Something went wrong!
          </h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800">Error:</h2>
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {errorInfo.error?.toString()}
              </p>
            </div>
            
            {errorInfo.errorInfo && (
              <div>
                <h2 className="font-semibold text-gray-800">Stack Trace:</h2>
                <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                  {errorInfo.errorInfo}
                </pre>
              </div>
            )}
            
            <button 
              onClick={() => {
                setErrorInfo({ error: null, errorInfo: null });
                window.location.reload();
              }} 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ErrorBoundary;