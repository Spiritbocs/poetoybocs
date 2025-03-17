'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get the code and state from the URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setErrorMessage(`Authorization failed: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setErrorMessage('Missing required parameters');
          return;
        }

        // Exchange the code for an access token
        const response = await axios.post('/api/auth', { code, state });

        if (response.data.success) {
          setStatus('success');
          
          // Redirect back to the armory page after a short delay
          setTimeout(() => {
            router.push('/armory');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(response.data.error || 'Failed to authenticate');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.response?.data?.error || error.message || 'An unknown error occurred');
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white flex flex-col items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg p-8 max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-bold text-[#af6025] mb-6 text-center">
          Path of Exile Authentication
        </h1>

        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#af6025] mx-auto mb-4"></div>
            <p className="text-[#a38d6d]">Authenticating with Path of Exile...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="bg-[#2a3a2a] border border-[#4a5a4a] rounded-lg p-4 mb-4">
              <p className="text-green-400 font-medium">Authentication successful!</p>
            </div>
            <p className="text-[#a38d6d]">Redirecting you back to the armory...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-[#3a1a1a] border border-[#6a2a2a] rounded-lg p-4 mb-4">
              <p className="text-red-400 font-medium">Authentication failed</p>
              {errorMessage && <p className="text-sm mt-2">{errorMessage}</p>}
            </div>
            <button
              onClick={() => router.push('/armory')}
              className="mt-4 px-6 py-2 bg-[#af6025] text-white font-medium rounded-md hover:bg-[#c27b3e] transition-colors duration-200"
            >
              Return to Armory
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
