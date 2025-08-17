'use client'

import { useState, useEffect } from 'react'
import { CharacterSummary } from '@/lib/poe-api'

interface CharacterDetails {
  character: CharacterSummary
  equipment?: any[]
  jewels?: any[]
  skills?: any[]
  passiveTree?: any
  stats?: {
    life?: number
    mana?: number
    energyShield?: number
    damage?: any
    defenses?: any
  }
}

interface CharacterDetailViewProps {
  character: CharacterSummary | null
  onClose: () => void
}

export function CharacterDetailView({ character, onClose }: CharacterDetailViewProps) {
  const [details, setDetails] = useState<CharacterDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'skills' | 'passives'>('overview')

  useEffect(() => {
    if (character) {
      loadCharacterDetails()
    }
  }, [character])

  const loadCharacterDetails = async () => {
    if (!character) return
    
    setIsLoading(true)
    setError('')
    
    try {
      console.log('[CharacterDetailView] Loading details for:', character.name)
      
      // For now, we'll create a mock details object
      // In Phase 2, we'll implement the actual PoE character API calls
      const mockDetails: CharacterDetails = {
        character,
        equipment: [],
        jewels: [],
        skills: [],
        passiveTree: {},
        stats: {
          life: Math.floor(Math.random() * 5000) + 3000,
          mana: Math.floor(Math.random() * 2000) + 500,
          energyShield: Math.floor(Math.random() * 3000),
          damage: {
            dps: Math.floor(Math.random() * 100000) + 10000,
            critChance: Math.floor(Math.random() * 80) + 5,
            critMultiplier: Math.floor(Math.random() * 300) + 150
          },
          defenses: {
            armor: Math.floor(Math.random() * 20000) + 1000,
            evasion: Math.floor(Math.random() * 15000) + 500,
            blockChance: Math.floor(Math.random() * 75) + 5
          }
        }
      }
      
      setDetails(mockDetails)
      
    } catch (err) {
      console.error('[CharacterDetailView] Error loading details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load character details')
    }
    
    setIsLoading(false)
  }

  if (!character) {
    return null
  }

  const getClassIcon = (className: string) => {
    const iconMap: { [key: string]: string } = {
      'Marauder': '⚔️',
      'Ranger': '🏹',
      'Witch': '🔮',
      'Duelist': '🛡️',
      'Templar': '⚡',
      'Shadow': '🗡️',
      'Scion': '👑'
    }
    return iconMap[className] || '🎮'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>
              {getClassIcon(character.class)}
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>{character.name}</h2>
              <div style={{ color: '#6c757d', fontSize: '1.1rem' }}>
                Level {character.level} {character.ascendancyClass ? `Asc${character.ascendancyClass}` : character.class}
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                {character.league || 'Unknown League'}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa'
        }}>
          {[
            { key: 'overview', label: '📊 Overview', icon: '📊' },
            { key: 'equipment', label: '⚔️ Equipment', icon: '⚔️' },
            { key: 'skills', label: '💎 Skills', icon: '💎' },
            { key: 'passives', label: '🌳 Passives', icon: '🌳' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                background: activeTab === tab.key ? 'white' : 'transparent',
                color: activeTab === tab.key ? '#007bff' : '#6c757d',
                borderBottom: activeTab === tab.key ? '2px solid #007bff' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <div>Loading character details...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#dc3545' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
              <div>{error}</div>
              <button 
                onClick={loadCharacterDetails}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && details && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {/* Core Stats */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>❤️ Core Stats</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Life:</span>
                        <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                          {formatNumber(details.stats?.life || 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mana:</span>
                        <span style={{ fontWeight: 'bold', color: '#3498db' }}>
                          {formatNumber(details.stats?.mana || 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Energy Shield:</span>
                        <span style={{ fontWeight: 'bold', color: '#9b59b6' }}>
                          {formatNumber(details.stats?.energyShield || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Damage Stats */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>⚔️ Damage</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>DPS:</span>
                        <span style={{ fontWeight: 'bold', color: '#e67e22' }}>
                          {formatNumber(details.stats?.damage?.dps || 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Crit Chance:</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {details.stats?.damage?.critChance || 0}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Crit Multi:</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {details.stats?.damage?.critMultiplier || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Defense Stats */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>🛡️ Defenses</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Armor:</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {formatNumber(details.stats?.defenses?.armor || 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Evasion:</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {formatNumber(details.stats?.defenses?.evasion || 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Block Chance:</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {details.stats?.defenses?.blockChance || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Character Info */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>ℹ️ Information</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Class:</span>
                        <span style={{ fontWeight: 'bold' }}>{character.class}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Level:</span>
                        <span style={{ fontWeight: 'bold' }}>{character.level}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>League:</span>
                        <span style={{ fontWeight: 'bold' }}>{character.league}</span>
                      </div>
                      {character.lastActive && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Last Active:</span>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {new Date(character.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Equipment Tab */}
              {activeTab === 'equipment' && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚔️</div>
                  <h3>Equipment Viewer</h3>
                  <p>Coming in Phase 2: Character Equipment Integration</p>
                  <div style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                    Will display: weapon, armor, jewelry, flasks, and item stats
                  </div>
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💎</div>
                  <h3>Skill Gems & Links</h3>
                  <p>Coming in Phase 2: Skill Tree Integration</p>
                  <div style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                    Will display: active skills, support gems, gem levels, and skill links
                  </div>
                </div>
              )}

              {/* Passives Tab */}
              {activeTab === 'passives' && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌳</div>
                  <h3>Passive Skill Tree</h3>
                  <p>Coming in Phase 2: Passive Tree Visualization</p>
                  <div style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                    Will display: allocated passives, skill tree visualization, and build analysis
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
