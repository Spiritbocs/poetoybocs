'use client'

import { useState, useEffect } from 'react'
import { poeApi, CharacterSummary } from '@/lib/poe-api'

interface CharacterSelectorProps {
  onCharacterSelect: (character: CharacterSummary | null) => void
  onShowDetail?: () => void
  isAuthenticated: boolean
}

export function CharacterSelector({ onCharacterSelect, onShowDetail, isAuthenticated }: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Load characters when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCharacters()
    } else {
      setCharacters([])
      setSelectedCharacter(null)
      onCharacterSelect(null)
    }
  }, [isAuthenticated])

  const loadCharacters = async (force = false) => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('[CharacterSelector] Loading characters...')
      
      // Try cached first
      if (!force) {
        const cached = poeApi.getCachedCharacters()
        if (cached && cached.length > 0) {
          console.log('[CharacterSelector] Using cached characters:', cached.length)
          setCharacters(cached)
          
          // Load previously selected character
          const savedChar = poeApi.getSelectedCharacter()
          if (savedChar) {
            setSelectedCharacter(savedChar)
            onCharacterSelect(savedChar)
          }
          setIsLoading(false)
          return
        }
      }
      
      // Fetch fresh data
      const fetchedCharacters = await poeApi.getCharacters(force)
      
      if (fetchedCharacters && fetchedCharacters.length > 0) {
        console.log('[CharacterSelector] Loaded characters:', fetchedCharacters.length)
        setCharacters(fetchedCharacters)
        
        // Auto-select highest level character if none selected
        if (!selectedCharacter) {
          const highestLevel = fetchedCharacters.reduce((prev, current) => 
            (current.level > prev.level) ? current : prev
          )
          setSelectedCharacter(highestLevel)
          poeApi.setSelectedCharacter(highestLevel.name)
          onCharacterSelect(highestLevel)
        }
      } else {
        setError('No characters found on your account')
      }
    } catch (err) {
      console.error('[CharacterSelector] Error loading characters:', err)
      setError(err instanceof Error ? err.message : 'Failed to load characters')
    }
    
    setIsLoading(false)
  }

  const handleCharacterChange = (characterName: string) => {
    const character = characters.find(c => c.name === characterName)
    if (character) {
      setSelectedCharacter(character)
      poeApi.setSelectedCharacter(character.name)
      onCharacterSelect(character)
      console.log('[CharacterSelector] Selected character:', character.name, character.level, character.class)
    }
  }

  const getCharacterDisplayName = (char: CharacterSummary) => {
    const ascClass = char.ascendancyClass ? `Asc${char.ascendancyClass}` : char.class
    return `${char.name} (L${char.level} ${ascClass})`
  }

  const getLeagueIcon = (league?: string) => {
    if (!league) return '🌟'
    // Standard league indicators
    if (league.includes('Hardcore')) return '💀'
    if (league.includes('Standard')) return '⚔️'
    if (league.includes('Challenge')) return '🏆'
    return '🌟' // Default for new leagues
  }

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: '1rem', margin: '1rem 0', textAlign: 'center', color: 'var(--poe-text-secondary)' }}>
        <div style={{ marginBottom: '0.5rem' }}>👤</div>
        <div>Login to access character data</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ margin: '1rem 0' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🏃 Character Selector
          {selectedCharacter && (
            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--poe-text-secondary)' }}>
              {getLeagueIcon(selectedCharacter.league)} {selectedCharacter.league}
            </span>
          )}
        </h3>
        <p style={{ margin: 0, color: 'var(--poe-text-secondary)', fontSize: '0.9rem' }}>
          {characters.length > 0 ? `${characters.length} characters available` : 'Managing your PoE characters'}
        </p>
      </div>
      
      <div style={{ padding: '1rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--poe-text-secondary)' }}>
            <div style={{ marginBottom: '0.5rem' }}>⏳</div>
            <div>Loading characters...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--poe-red)' }}>
            <div style={{ marginBottom: '0.5rem' }}>❌</div>
            <div>{error}</div>
            <button 
              onClick={() => loadCharacters(true)}
              className="btn btn-outline-primary"
              style={{ marginTop: '1rem' }}
            >
              Retry
            </button>
          </div>
        ) : characters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--poe-text-secondary)' }}>
            <div style={{ marginBottom: '0.5rem' }}>🎮</div>
            <div>No characters found</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Create a character in Path of Exile first
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Character dropdown */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Select Character:
              </label>
              <select
                value={selectedCharacter?.name || ''}
                onChange={(e) => handleCharacterChange(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              >
                <option value="">Choose a character...</option>
                {characters.map((char) => (
                  <option key={char.name} value={char.name}>
                    {getCharacterDisplayName(char)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected character details */}
            {selectedCharacter && (
              <div 
                className="card" 
                style={{ 
                  padding: '1rem',
                  backgroundColor: 'var(--poe-bg-card)',
                  border: '2px solid var(--poe-accent)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '2rem' }}>
                    {selectedCharacter.ascendancyClass ? (
                      <img 
                        src={poeApi.getAscendancyIcon(selectedCharacter.ascendancyClass.toString()) || ''} 
                        alt={selectedCharacter.class}
                        style={{ width: '48px', height: '48px' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : '🗡️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {selectedCharacter.name}
                    </div>
                    <div style={{ color: 'var(--poe-text-secondary)', fontSize: '0.9rem' }}>
                      Level {selectedCharacter.level} {selectedCharacter.ascendancyClass ? `Asc${selectedCharacter.ascendancyClass}` : selectedCharacter.class}
                    </div>
                    <div style={{ color: 'var(--poe-text-secondary)', fontSize: '0.8rem' }}>
                      {getLeagueIcon(selectedCharacter.league)} {selectedCharacter.league || 'Unknown League'}
                    </div>
                  </div>
                </div>
                
                {/* Future: Add last active time if available */}
                {selectedCharacter.lastActive && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--poe-text-secondary)' }}>
                    Last Active: {new Date(selectedCharacter.lastActive).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
              <button 
                onClick={() => loadCharacters(true)}
                className="btn btn-outline-primary"
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                🔄 Refresh
              </button>
              
              {selectedCharacter && (
                <button 
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={() => {
                    if (onShowDetail) {
                      onShowDetail()
                    } else {
                      console.log('Opening character details for:', selectedCharacter.name)
                    }
                  }}
                >
                  📋 View Details
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
