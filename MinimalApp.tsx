import React from 'react';

export default function MinimalApp() {
  console.log('🧪 Minimal app rendering...');
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          ✅ React App is Working!
        </h1>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            If you can see this page, then React is working correctly.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h2 className="font-semibold text-blue-800 mb-2">Test Results:</h2>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✅ React is rendering</li>
              <li>✅ Vite dev server is working</li>
              <li>✅ TypeScript compilation successful</li>
              <li>✅ Tailwind CSS is loaded</li>
            </ul>
          </div>
          
          <button 
            onClick={() => {
              console.log('🎯 Button clicked - JavaScript is working');
              alert('JavaScript is working! 🎉');
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Test JavaScript Interaction
          </button>
        </div>
      </div>
    </div>
  );
}