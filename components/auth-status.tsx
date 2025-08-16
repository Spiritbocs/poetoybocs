"use client"

import { useState, useEffect } from "react"
import { poeApi } from "@/lib/poe-api"

export function AuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [characters, setCharacters] = useState<any[] | null>(null)
  const [selectedChar, setSelectedChar] = useState<any | null>(null)
  const [charLoading, setCharLoading] = useState(false)
  const envReady = (process.env.NEXT_PUBLIC_POE_CLIENT_ID?.length || 0) > 0 && (process.env.NEXT_PUBLIC_POE_REDIRECT_URI?.length || 0) > 0

  useEffect(() => {
    // Check for stored token on component mount
    const hasToken = poeApi.loadStoredToken()
    setIsAuthenticated(hasToken)
    const loadProfile = async () => {
      if (hasToken) {
        const cached = poeApi.getCachedProfile()
        if (cached?.name) setAccountName(cached.name)
        const profile = await poeApi.getProfile(false)
        if (profile?.name) setAccountName(profile.name)
        // Load characters (lazy)
        setCharLoading(true)
        const cachedChars = poeApi.getCachedCharacters()
        if (cachedChars) {
          setCharacters(cachedChars)
          setSelectedChar(poeApi.getSelectedCharacter())
        }
        const chars = await poeApi.getCharacters(false)
        if (chars) {
          setCharacters(chars)
          setSelectedChar(poeApi.getSelectedCharacter())
        }
        setCharLoading(false)
      }
      setIsLoading(false)
    }
    loadProfile()
  }, [])

  const handleLogin = async () => {
    try {
      const authUrl = await poeApi.getAuthUrl()
      if (authUrl) {
        window.location.href = authUrl
      } else {
        // Popup handled authentication; refresh local state
        const prof = await poeApi.getProfile(true)
        if (prof?.name) setAccountName(prof.name)
        setIsAuthenticated(poeApi.isAuthenticated())
      }
    } catch (error) {
      console.error("Error generating auth URL:", error)
    }
  }

  const handleLogout = () => {
    poeApi.logout()
    setIsAuthenticated(false)
    setAccountName(null)
    setCharacters(null)
    setSelectedChar(null)
  }

  const handleCharacterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value
    poeApi.setSelectedCharacter(name)
    setSelectedChar(poeApi.getSelectedCharacter())
  }

  const ascName = selectedChar?.class || undefined
  const avatarUrl = ascName ? poeApi.getAscendancyIcon(ascName) : null

  const retryCharacters = async () => {
    setCharLoading(true)
    const chars = await poeApi.getCharacters(true)
    if (chars) {
      setCharacters(chars)
      setSelectedChar(poeApi.getSelectedCharacter())
    }
    setCharLoading(false)
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          Loading authentication status...
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🔐 Authentication
          {isAuthenticated && accountName && (
            <span className="status status-connected" style={{ fontSize: '0.75rem' }}>{accountName}</span>
          )}
        </h3>
        {!isAuthenticated && <div className="status status-disconnected">Not Connected</div>}
      </div>

      {!isAuthenticated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={handleLogin}
            className="btn btn-accent"
            disabled={!envReady}
            title={envReady ? "Authenticate with Path of Exile" : "Environment not configured"}
          >
            🔗 Connect to Path of Exile
          </button>
          {!envReady && (
            <p className="mt-2 text-xs text-muted">Set NEXT_PUBLIC_POE_CLIENT_ID & NEXT_PUBLIC_POE_REDIRECT_URI then restart.</p>
          )}
        </div>
      )}

      {isAuthenticated && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={ascName || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>No Avatar</span>
            )}
          </div>
          <div style={{ flex: 1, lineHeight: 1.3 }}>
            {selectedChar ? (
              <>
                <div style={{ fontWeight: 600 }}>{selectedChar.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  Level {selectedChar.level} {selectedChar.class}
                  {selectedChar.league && <span> – {selectedChar.league}</span>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.7rem', opacity: 0.7, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {charLoading ? 'Loading characters...' : 'No characters found'}
                {!charLoading && (
                  <button onClick={retryCharacters} className="btn btn-sm btn-secondary" style={{ fontSize: '0.6rem', padding: '2px 6px', alignSelf: 'flex-start' }}>↻ Retry</button>
                )}
              </div>
            )}
            {characters && characters.length > 1 && (
              <select value={selectedChar?.name || ''} onChange={handleCharacterChange} style={{ marginTop: 4, fontSize: '0.7rem', width: '100%' }}>
                {characters.map(c => (
                  <option key={c.name} value={c.name}>{c.name} (Lv {c.level})</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleLogout} className="btn btn-primary" style={{ flex: '0 0 auto' }}>🚪 Disconnect</button>
          <a href="https://discord.com/users/625796542456004639" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: '0 0 auto' }}>
            💬 Contact Support
          </a>
        </div>
      )}
    </div>
  )
}
