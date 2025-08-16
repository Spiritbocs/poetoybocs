'use client'

import { useState, useEffect } from 'react'

interface DesktopSessionManagerProps {
  onSessionReady: (sessionId: string) => void
  isTradeEnabled: boolean
  league: string
}

export function DesktopSessionManager({ onSessionReady, isTradeEnabled, league }: DesktopSessionManagerProps) {
  const [sessionId, setSessionId] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)
  const [autoDetectionStatus, setAutoDetectionStatus] = useState<{
    available: boolean
    method: string
    message: string
  } | null>(null)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    message: string
  } | null>(null)

  // Check for existing session and auto-detection capabilities on mount
  useEffect(() => {
    const checkDesktopCapabilities = async () => {
      // Check if we have a stored session
      const saved = localStorage.getItem('poe_session_id')
      if (saved) {
        setSessionId(saved)
        validateSession(saved)
        return
      }

      // Check auto-detection capability (desktop only)
      if ((window as any).electronAPI) {
        try {
          const detection = await (window as any).electronAPI.detectPoeSession()
          setAutoDetectionStatus(detection)
          
          if (detection.success && detection.sessionId) {
            setSessionId(detection.sessionId)
            validateSession(detection.sessionId)
          }
        } catch (error) {
          console.log('[DesktopSessionManager] Auto-detection not available:', error)
        }
      }
    }

    checkDesktopCapabilities()
  }, [])

  const validateSession = async (id: string) => {
    setIsValidating(true)
    try {
      // Desktop validation using direct API
      if ((window as any).electronAPI) {
        console.log('[DesktopSessionManager] Validating session for league:', league)
        const { electronTradeAPI } = await import('../lib/electron-trade-api')
        const desktopTest = await electronTradeAPI.testConnection(league, id)
        
        console.log('[DesktopSessionManager] Validation result:', desktopTest)
        
        if (desktopTest.success) {
          setValidationResult({
            valid: true,
            message: `✅ Session active! Using ${desktopTest.method} (desktop advantage)`
          })
          localStorage.setItem('poe_session_id', id)
          onSessionReady(id)
        } else {
          setValidationResult({
            valid: false,
            message: `❌ Session invalid: ${desktopTest.error || 'Unknown error'}`
          })
        }
      } else {
        setValidationResult({
          valid: false,
          message: '❌ Desktop API not available'
        })
      }
    } catch (error) {
      console.error('[DesktopSessionManager] Validation failed:', error)
      setValidationResult({
        valid: false,
        message: `❌ Session validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
    setIsValidating(false)
  }

  const handleQuickSetup = async () => {
    // Open PoE trade in system browser for easy session copying
    if ((window as any).electronAPI) {
      try {
        await (window as any).electronAPI.openPoeTradeInBrowser(league)
        // Show simplified instructions
      } catch (error) {
        console.error('Failed to open PoE trade:', error)
      }
    }
  }

  const handleSessionSubmit = () => {
    if (sessionId.trim()) {
      validateSession(sessionId.trim())
    }
  }

  if (isTradeEnabled && validationResult?.valid) {
    return (
      <div className="card" style={{ backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724', padding: '1rem', margin: '1rem 0' }}>
        ✅ Trade features active! Desktop mode provides direct PoE API access.
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '1rem auto' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🖥️ Desktop Trade Setup
        </h3>
        <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
          Like Awakened PoE Trade - simple session setup for full trade access
        </p>
      </div>
      
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Auto-detection status */}
          {autoDetectionStatus && (
            <div 
              className="card" 
              style={{ 
                padding: '0.75rem',
                backgroundColor: autoDetectionStatus.available ? '#e8f5e8' : '#fff3cd',
                borderColor: autoDetectionStatus.available ? '#c3e6cb' : '#ffeaa7'
              }}
            >
              <strong>{autoDetectionStatus.available ? '🔍 Auto-Detection:' : '📋 Manual Setup:'}</strong>
              <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {autoDetectionStatus.message}
              </div>
            </div>
          )}

          {/* Quick setup button - like Awakened PoE Trade */}
          <button 
            onClick={handleQuickSetup}
            className="btn btn-primary"
            style={{ padding: '0.75rem', width: '100%' }}
          >
            🚀 Quick Setup - Open PoE Trade
          </button>
          
          <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#6c757d' }}>
            After logging in, copy your POESESSID:
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Paste POESESSID here..."
              className="form-control"
              style={{ flex: 1 }}
            />
            <button 
              onClick={handleSessionSubmit}
              disabled={isValidating || !sessionId.trim()}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem' }}
            >
              {isValidating ? 'Testing...' : 'Connect'}
            </button>
          </div>

          {/* Simple instructions */}
          <div style={{ fontSize: '0.85rem', color: '#6c757d', lineHeight: '1.4' }}>
            <strong>How to get POESESSID:</strong>
            <ol style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>Click "Quick Setup" above</li>
              <li>Login to your PoE account</li>
              <li>Press F12 → Application → Cookies</li>
              <li>Find "POESESSID" and copy its value</li>
              <li>Paste above and click "Connect"</li>
            </ol>
          </div>
        </div>

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
            {validationResult.message}
            {!validationResult.valid && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                💡 <strong>Desktop advantage:</strong> Once connected, no server issues or IP blocking!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
