'use client'

import { useState, useEffect } from 'react'

interface SessionManagerProps {
  onSessionReady: (sessionId: string) => void
  isTradeEnabled: boolean
  league: string
}

export function SessionManager({ onSessionReady, isTradeEnabled, league }: SessionManagerProps) {
  const [sessionId, setSessionId] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    message: string
  } | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Check for existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem('poe_session_id')
    if (saved) {
      setSessionId(saved)
      validateSession(saved)
    }
  }, [])

  const validateSession = async (id: string) => {
    setIsValidating(true)
    try {
      const res = await fetch('/api/session/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, league })
      })
      
      const result = await res.json()
      setValidationResult(result)
      
      if (result.valid) {
        localStorage.setItem('poe_session_id', id)
        onSessionReady(id)
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        message: 'Failed to validate session'
      })
    }
    setIsValidating(false)
  }

  const handleSessionSubmit = () => {
    if (sessionId.trim()) {
      validateSession(sessionId.trim())
    }
  }

  const extractSessionFromCookies = () => {
    // This will work when user returns from PoE website
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'POESESSID') {
        setSessionId(value)
        validateSession(value)
        return
      }
    }
    
    // If no cookie found, try to get fresh session from server
    tryRefreshSession()
  }

  const tryRefreshSession = async () => {
    try {
      const res = await fetch('/api/session/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league })
      })
      
      const result = await res.json()
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId)
        validateSession(result.sessionId)
      } else {
        setShowInstructions(true)
      }
    } catch (error) {
      console.error('Failed to refresh session:', error)
      setShowInstructions(true)
    }
  }

  if (isTradeEnabled && validationResult?.valid) {
    return (
      <div className="card" style={{ backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724', padding: '1rem', margin: '1rem 0' }}>
        ✅ Trade features enabled! Session is working correctly.
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '1rem auto' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔗 Enable Trade Features
        </h3>
        <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
          Connect your Path of Exile account to access real-time trade data
        </p>
      </div>
      
      <div style={{ padding: '1rem' }}>
        {!showInstructions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              onClick={() => {
                const url = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`
                window.open(url, '_blank')
              }}
              className="btn btn-outline"
              style={{ padding: '0.75rem', width: '100%' }}
            >
              1. Login to Path of Exile Trade
            </button>
            
            <button 
              onClick={extractSessionFromCookies}
              className="btn btn-primary"
              style={{ padding: '0.75rem', width: '100%' }}
            >
              2. Auto-Detect Session
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6c757d' }}>
              or enter manually:
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="POESESSID cookie value"
                className="form-control"
                style={{ flex: 1 }}
              />
              <button 
                onClick={handleSessionSubmit}
                disabled={isValidating || !sessionId.trim()}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem' }}
              >
                {isValidating ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.9rem' }}>
            <div className="card" style={{ backgroundColor: '#fff3cd', borderColor: '#ffeaa7', padding: '1rem', marginBottom: '1rem' }}>
              <strong>Manual Setup Required:</strong>
              <ol style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                <li>Open Path of Exile Trade in a new tab</li>
                <li>Login to your account</li>
                <li>Press F12 → Application → Cookies</li>
                <li>Find "POESESSID" and copy its value</li>
                <li>Paste it in the field above</li>
              </ol>
            </div>
            
            <button 
              onClick={() => setShowInstructions(false)}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1rem' }}
            >
              Back to Auto-Detect
            </button>
          </div>
        )}

        {validationResult && (
          <div 
            className="card" 
            style={{ 
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: validationResult.valid ? '#d4edda' : '#f8d7da',
              borderColor: validationResult.valid ? '#c3e6cb' : '#f5c6cb',
              color: validationResult.valid ? '#155724' : '#721c24'
            }}
          >
            {validationResult.valid ? '✅' : '❌'} {validationResult.message}
            {!validationResult.valid && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                💡 <strong>Tip:</strong> Session may be expired. Try logging in again to get a fresh session ID.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
