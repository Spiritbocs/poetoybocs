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
    const upstream = await fetch(`https://www.poewiki.net/wiki/${encodeURIComponent(title)}`, { headers:{ 'User-Agent':'poetoybocs/1.0 (+github)'} })
    if (!upstream.ok) return new Response('Upstream fail', { status: 502 })
    const text = await upstream.text()
    // Extract main content
    const mainMatch = text.match(/<div id="mw-content-text"[\s\S]*?<div class="printfooter">/)
    if (!mainMatch) return new Response('Content not found', { status: 404 })
    let main = mainMatch[0]
    // Remove scripts/styles/navboxes/tables of contents beyond first
    main = main.replace(/<script[\s\S]*?<\/script>/gi,'')
      .replace(/<style[\s\S]*?<\/style>/gi,'')
      .replace(/<table class="infobox[\s\S]*?<\/table>/i,'') // remove side infobox (we'll display metrics ourselves)
      .replace(/<div id="toc"[\s\S]*?<\/div>/i,'')
      .replace(/class="(?:mw-editsection|noprint|navbox)[^"]*"[\s\S]*?<\/div>/gi,'')
      .replace(/<!--[^]*?-->/g,'')
    // Keep only first ~25k chars to avoid bloat
    if (main.length > 25000) main = main.slice(0,25000) + '<p><em>[Truncated]</em></p>'
    // Basic sanitization: strip on* handlers
    main = main.replace(/ on[a-z]+="[^"]*"/gi,'')
    cache.set(key,{ ts:Date.now(), html: main })
    return new Response(main, { status:200, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=3600'}})
  } catch (e:any) {
    return new Response('Error '+(e?.message||'unknown'), { status:500 })
  }
}
