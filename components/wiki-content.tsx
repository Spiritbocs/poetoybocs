"use client"
import { useEffect, useState } from 'react'

interface WikiContentProps { title: string }
export function WikiContent({ title }: WikiContentProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const load = async() => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/wiki?title=${encodeURIComponent(title)}`)
      if (!res.ok) throw new Error(res.status+'')
      const text = await res.text()
      setHtml(text)
    } catch (e:any) { setError('Wiki load failed') } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [title])
  const truncated = !expanded && html && html.length > 15000
  return (
    <div style={{background:'#121212',border:'1px solid #272727',borderRadius:8,padding:'18px 22px',marginTop:28}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
        <h3 style={{margin:0,fontSize:16}}>Wiki Information</h3>
        {loading && <div style={{fontSize:12,opacity:.6}}>Loading…</div>}
        {error && <div style={{fontSize:12,color:'#f87171'}}>{error}</div>}
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={load} disabled={loading} style={{background:'#1e1e1e',border:'1px solid #333',padding:'4px 10px',color:'#ccc',fontSize:11,borderRadius:4,cursor:'pointer'}}>Reload</button>
          {html && html.length>15000 && <button onClick={()=>setExpanded(e=>!e)} style={{background:'#1e1e1e',border:'1px solid #333',padding:'4px 10px',color:'#ccc',fontSize:11,borderRadius:4,cursor:'pointer'}}>{expanded? 'Collapse':'Expand'}</button>}
        </div>
      </div>
      {!html && !loading && !error && <div style={{fontSize:12,opacity:.6}}>No content.</div>}
      {html && (
        <div style={{maxHeight: expanded? 1200: 420, overflow:'auto'}} className="wiki-content" dangerouslySetInnerHTML={{__html: truncated? html.slice(0,15000)+'<p><em>[Collapsed – click Expand]</em></p>': html }} />
      )}
      <style jsx global>{`
        .wiki-content h1, .wiki-content h2, .wiki-content h3 { font-size:14px; margin:16px 0 6px; }
        .wiki-content p { line-height:1.4; font-size:13px; margin:8px 0; }
        .wiki-content ul { margin:8px 0 8px 20px; padding:0; }
        .wiki-content li { font-size:13px; margin:4px 0; }
        .wiki-content table { display:none; }
        .wiki-content a { color:#67bfff; text-decoration:none; }
        .wiki-content a:hover { text-decoration:underline; }
        .wiki-content img { max-width:240px; height:auto; }
        .wiki-content .infobox { display:none; }
      `}</style>
    </div>
  )
}
