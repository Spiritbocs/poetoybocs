'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface PoeLoginProps {
  onLoginStatusChange?: (isLoggedIn: boolean) => void;
}

export default function PoeLogin({ onLoginStatusChange }: PoeLoginProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check login status on component mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Function to check if the user is logged in
  const checkLoginStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get('/api/auth');
      setIsLoggedIn(response.data.authenticated);
      
      // Notify parent component if callback is provided
      if (onLoginStatusChange) {
        onLoginStatusChange(response.data.authenticated);
      }
    } catch (err) {
      console.error('Error checking login status:', err);
      setError('Failed to check login status');
      setIsLoggedIn(false);
      
      if (onLoginStatusChange) {
        onLoginStatusChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to initiate the login process
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get('/api/auth?action=login');
      
      if (response.data.authUrl) {
        // Redirect to Path of Exile OAuth page
        window.location.href = response.data.authUrl;
      } else {
        setError('Failed to get authorization URL');
      }
    } catch (err) {
      console.error('Error initiating login:', err);
      setError('Failed to initiate login process');
      setIsLoading(false);
    }
  };

  // Function to log out
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await axios.get('/api/auth?action=logout');
      setIsLoggedIn(false);
      
      if (onLoginStatusChange) {
        onLoginStatusChange(false);
      }
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to log out');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center h-10">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#af6025]"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {error && (
        <div className="text-red-400 text-xs mr-2">{error}</div>
      )}
      
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-[#3d3d3d] hover:bg-[#4d4d4d] text-white rounded-md transition-colors duration-200 flex items-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          Logout
        </button>
      ) : (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-[#af6025] hover:bg-[#c27b3e] text-white rounded-md transition-colors duration-200 flex items-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          )}
          Login with PoE
        </button>
      )}
      
      {isLoggedIn && (
        <div className="text-green-400 text-xs">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 inline-block mr-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Authenticated
        </div>
      )}
    </div>
  );
}
