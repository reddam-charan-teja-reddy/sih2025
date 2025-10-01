'use client';

import { useState } from 'react';

export default function RefreshTokenDebugger() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkRefreshToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/refresh-status', {
        credentials: 'include',
      });
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg max-w-md z-50'>
      <h3 className='font-bold mb-2'>🔧 Token Debug Tool</h3>

      <button
        onClick={checkRefreshToken}
        disabled={loading}
        className='bg-blue-600 px-3 py-1 rounded text-sm mb-2'>
        {loading ? 'Checking...' : 'Check Refresh Token'}
      </button>

      {debugInfo && (
        <div className='text-xs space-y-1'>
          <p>
            <strong>Status:</strong> {debugInfo.status}
          </p>
          {debugInfo.debug && (
            <div className='bg-gray-800 p-2 rounded'>
              <pre>{JSON.stringify(debugInfo.debug, null, 2)}</pre>
            </div>
          )}
          {debugInfo.error && (
            <p className='text-red-400'>Error: {debugInfo.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
