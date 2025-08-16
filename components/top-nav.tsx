"use client"

import { useState, useEffect } from 'react'
import { poeApi, type League } from '@/lib/poe-api'
import { useLeague } from './league-context'


export function TopNav() {
  const { league, realm, setLeague, setRealm } = useLeague()
  const [isAuth, setIsAuth] = useState(false)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [loadingLeagues, setLoadingLeagues] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [nextCountdown, setNextCountdown] = useState<string>('')
  const [age, setAge] = useState<string>('')
  const envReady = (process.env.NEXT_PUBLIC_POE_CLIENT_ID?.length || 0) > 0 && (process.env.NEXT_PUBLIC_POE_REDIRECT_URI?.length || 0) > 0

  // Auth init
  useEffect(()=>{
    const has = poeApi.loadStoredToken()
    setIsAuth(has)
    async function load() {
      if (has) {
        const cached = poeApi.getCachedProfile()
        if (cached?.name) setAccountName(cached.name)
        const prof = await poeApi.getProfile(false)
        if (prof?.name) setAccountName(prof.name)
      }
      setLoadingAuth(false)
    }
    load()
  }, [])

  // League list
  useEffect(()=>{
    let cancelled = false
    async function loadLeagues() {
      try {
        setLoadingLeagues(true)
        const data = await poeApi.getLeagues(realm)
        if (cancelled) return
        setLeagues(data)
        // If current league is Ruthless and Mercenaries exists, auto switch
        if (/ruthless/i.test(league)) {
          const merc = data.find(l=> /^Mercenaries$/i.test(l.id))
          if (merc) setLeague(merc.id)
        } else if (!league) {
          const current = data.find(l=> /^Mercenaries$/i.test(l.id)) || data.find(l=>l.category?.current) || data[0]
          if (current) setLeague(current.id)
        }
      } finally {
        if (!cancelled) setLoadingLeagues(false)
      }
    }
    loadLeagues()
    return ()=>{ cancelled = true }
  }, [realm])

  // Global timers (read-only; updated by currency tracker via localStorage)
  useEffect(()=>{
    // Establish an immutable schedule origin if not already set (used only for reference / debugging)
    try {
      const origin = localStorage.getItem('global_schedule_origin')
      const last = localStorage.getItem('global_last_updated')
      if (!origin && last) {
        localStorage.setItem('global_schedule_origin', last)
      }
    } catch {}

    const interval = setInterval(()=>{
      try {
        const lastStr = localStorage.getItem('global_last_updated')
        const nextStr = localStorage.getItem('global_next_refresh')
        const now = Date.now()
        if (lastStr) {
          const last = Number(lastStr)
          if (!isNaN(last)) {
            const diff = now - last
            const m = Math.floor(diff/60000)
            const s = Math.floor((diff%60000)/1000)
            setAge(`${m}:${s.toString().padStart(2,'0')}`)
          }
        }
        if (nextStr) {
          const nxt = Number(nextStr)
          if (!isNaN(nxt)) {
            const diff = nxt - now
            if (diff <= 0) setNextCountdown('Refreshing…')
            else {
              const m = Math.floor(diff/60000)
              const s = Math.floor((diff%60000)/1000)
              setNextCountdown(`${m}:${s.toString().padStart(2,'0')}`)
            }
          }
        }
      } catch {}
    }, 1000)
    return ()=> clearInterval(interval)
  }, [])

  const handleLogin = async () => {
    try {
      const url = await poeApi.getAuthUrl()
      window.location.href = url
    } catch (e) {
      console.error('Auth url error', e)
    }
  }
  const handleLogout = () => {
    poeApi.logout()
    setIsAuth(false)
    setAccountName(null)
  }

  return (
    <nav className="top-nav" style={{position:'sticky',top:0,zIndex:50,background:'linear-gradient(90deg,#121212,#181818 40%,#1d1a14 95%)',borderBottom:'1px solid #2a2a2a',padding:'8px 16px',display:'flex',alignItems:'center',gap:16,backdropFilter:'blur(6px)'}}>
      {/* Brand stays left */}
      <div style={{fontWeight:700,fontSize:'1rem',letterSpacing:'.5px',display:'flex',alignItems:'center',gap:6}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:6,textDecoration:'none'}}>
          <span style={{color:'var(--poe-gold, #c8aa6e)'}}>Spiritbocs</span>
          <span style={{opacity:.65}}>Tracker</span>
        </a>
      </div>
      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:18}}>
        {/* Timers */}
        <div style={{display:'flex',alignItems:'center',gap:14,fontSize:11,letterSpacing:.5,whiteSpace:'nowrap',padding:'2px 10px',borderRadius:20,background:'linear-gradient(120deg,#222,#1a1a1a)',border:'1px solid #2f2f2f',boxShadow:'0 0 0 1px rgba(255,255,255,0.04), inset 0 0 6px rgba(0,0,0,.6)'}}>
          <div title="Time until next scheduled refresh (client-side)" style={{display:'flex',gap:4,alignItems:'center'}}>
            <span style={{opacity:.55}}>Next</span><strong>{nextCountdown || '--:--'}</strong>
          </div>
          <div title="Age of last fetched currency dataset" style={{display:'flex',gap:4,alignItems:'center'}}>
            <span style={{opacity:.55}}>Age</span><strong>{age || '0:00'}</strong>
          </div>
        </div>
        {/* Selectors */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <select aria-label="Realm" value={realm} onChange={e=>setRealm(e.target.value as any)} style={selectStyle}>
            <option value="pc">PC</option>
            <option value="xbox">Xbox</option>
            <option value="sony">PlayStation</option>
          </select>
          <select aria-label="League" value={league} onChange={e=>setLeague(e.target.value)} style={selectStyle} disabled={loadingLeagues || leagues.length===0}>
            {loadingLeagues && <option>Loading...</option>}
            {!loadingLeagues && leagues.map(l=> <option key={l.id} value={l.id}>{l.id}{l.category?.current ? ' *':''}</option>)}
          </select>
        </div>
        {/* Auth */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {loadingAuth ? (
            <span style={{fontSize:12,opacity:.7}}>Checking auth...</span>
          ) : !isAuth ? (
            <button onClick={handleLogin} disabled={!envReady} style={btnStylePrimary}>Connect</button>
          ) : (
            <>
              <span style={{fontSize:12,background:'linear-gradient(90deg,#2d2214,#3b2c17)',padding:'4px 10px',borderRadius:20,border:'1px solid #5a4224',color:'#eac07c',boxShadow:'0 0 0 1px rgba(0,0,0,.4), inset 0 0 4px rgba(255,255,255,0.05)'}}>{accountName || 'Account'}</span>
              <button onClick={handleLogout} style={btnStyle}>Disconnect</button>
            </>
          )}
          <button
            onClick={() => {
              const username = 'spbocs'
              const appLink = `tg://resolve?domain=${username}`
              const webLink = `https://t.me/${username}`
              // Try app deep link; fallback to web if it appears not handled.
              let navigated = false
              try {
                window.location.href = appLink
                navigated = true
              } catch {}
              setTimeout(() => {
                if (!document.hidden) {
                  window.open(webLink, '_blank', 'noopener,noreferrer')
                }
              }, 900)
            }}
            style={btnStyle}
            title="Open Telegram"
          >Support</button>
        </div>
      </div>
    </nav>
  )
}

const selectStyle: React.CSSProperties = {
  background:'linear-gradient(#2a2a2a,#202020)',
  color:'#e4e4e4',
  border:'1px solid #3d3d3d',
  padding:'5px 8px',
  borderRadius:6,
  fontSize:12,
  boxShadow:'0 1px 2px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
  appearance:'none'
}
const btnStyle: React.CSSProperties = {
  background:'linear-gradient(#2b2b2b,#1f1f1f)',
  color:'#d8d8d8',
  border:'1px solid #3b3b3b',
  padding:'5px 12px',
  borderRadius:18,
  fontSize:12,
  cursor:'pointer',
  boxShadow:'0 1px 2px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.04)',
  transition:'background .15s, color .15s, transform .15s'
}
const btnStylePrimary: React.CSSProperties = {
  ...btnStyle,
  background:'linear-gradient(90deg,#7d531f,#b47a2d)',
  border:'1px solid #b58235',
  color:'#ffe7b8'
}
