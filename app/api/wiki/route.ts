import type { NextRequest } from 'next/server'

// Simple in-memory cache (process lifetime) to reduce repeated wiki fetches.
const cache = new Map<string,{ ts:number; html:string }>()
const TTL = 6 * 60 * 60 * 1000 // 6h

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const titleRaw = searchParams.get('title') || ''
  if (!titleRaw) return new Response('Missing title', { status: 400 })
  const title = titleRaw.replace(/[^A-Za-z0-9 _'"-]/g,'').replace(/\s+/g,'_')
  const key = title.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now()-cached.ts < TTL) {
    return new Response(cached.html, { status:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=3600'}})
  }
  try {
    const fetchWiki = async(): Promise<string|null> => {
      try {
        const upstream = await fetch(`https://www.poewiki.net/wiki/${encodeURIComponent(title)}`, { headers:{ 'User-Agent':'poetoybocs/1.0 (+github)'} })
        if (!upstream.ok) return null
        const text = await upstream.text()
        // Broad extraction for MediaWiki main content
        const mainMatch = text.match(/<div id="mw-content-text"[\s\S]*?<div class="printfooter">/) || text.match(/<div id="mw-content-text"[\s\S]*?<\/div>\s*<div id="catlinks"/)
        if (!mainMatch) return null
        let main = mainMatch[0]
        main = main.replace(/<script[\s\S]*?<\/script>/gi,'')
          .replace(/<style[\s\S]*?<\/style>/gi,'')
          .replace(/<!--[^]*?-->/g,'')
        return main
      } catch { return null }
    }
    const fetchPoeDb = async(): Promise<string|null> => {
      try {
        const resp = await fetch(`https://poedb.tw/us/${encodeURIComponent(title)}`, { headers:{ 'User-Agent':'poetoybocs/1.0 (+github)'} })
        if (!resp.ok) return null
        const html = await resp.text()
        // Attempt to extract central content region (poedb uses <main id="main"> or container div)
        const match = html.match(/<main[^>]*>[\s\S]*?<\/main>/i) || html.match(/<div id="wrapper"[\s\S]*?<\/div>\s*<footer/i)
        if (!match) return null
        let block = match[0]
        block = block.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<!--[^]*?-->/g,'')
        return `<div class="poedb-source">${block}</div>`
      } catch { return null }
    }

    let content = await fetchWiki()
    if (!content) content = await fetchWiki() // retry once
    if (!content) content = await fetchPoeDb()
    if (!content) content = `<p>Wiki content unavailable right now.</p>`

    // Trim & sanitize
    if (content.length > 30000) content = content.slice(0,30000) + '<p><em>[Truncated]</em></p>'
    content = content.replace(/ on[a-z]+="[^"]*"/gi,'')
    cache.set(key,{ ts:Date.now(), html: content })
    return new Response(content, { status:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=3600'}})
  } catch (e:any) {
    const fallback = '<p>Wiki content unavailable.</p>'
    return new Response(fallback, { status:200, headers:{'Content-Type':'text/html; charset=utf-8'}})
  }
}
