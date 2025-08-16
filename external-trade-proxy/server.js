#!/usr/bin/env node
// Minimal external trade proxy to bypass Cloudflare blocking on serverless.
// Usage: node server.js --port 8787 --session "POESESSID=..." --allow-origin https://yourapp.com

import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'
import morgan from 'morgan'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv))
  .option('port', { type: 'number', default: process.env.PORT || 8787 })
  .option('session', { type: 'string', default: process.env.POESESSID || '' })
  .option('allow-origin', { type: 'string', default: process.env.ALLOW_ORIGIN || '*' })
  .parseSync()

const app = express()
app.use(express.json({ limit: '32kb' }))
app.use(morgan('tiny'))

const allowOrigin = argv['allow-origin']
app.use(cors({ origin: allowOrigin === '*' ? true : allowOrigin.split(',').map(s=>s.trim()), credentials: false }))

const BASE = 'https://www.pathofexile.com'

function buildHeaders(extra = {}) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': BASE,
    'Referer': `${BASE}/trade/search`,
    ...(argv.session ? { 'Cookie': `POESESSID=${argv.session}` } : {}),
    ...extra
  }
}

app.post('/search', async (req, res) => {
  try {
    const { league, query } = req.body || {}
    if (!league || !query) return res.status(400).json({ error: 'invalid_request' })
    const upstream = `${BASE}/api/trade/search/${encodeURIComponent(league)}`
    const r = await fetch(upstream, { method: 'POST', headers: buildHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(query) })
    const text = await r.text()
    let json = null; try { json = JSON.parse(text) } catch {}
    if (!r.ok) return res.status(r.status).json({ error: 'upstream_error', status: r.status, body: text.slice(0,2000) })
    // trim result ids
    const result = Array.isArray(json?.result) ? json.result.slice(0,100) : []
    res.json({ id: json?.id, total: json?.total ?? 0, result })
  } catch (e) {
    res.status(500).json({ error: 'proxy_failure', message: String(e) })
  }
})

app.post('/fetch', async (req, res) => {
  try {
    const { ids, query } = req.body || {}
    if (!Array.isArray(ids) || !ids.length || !query) return res.status(400).json({ error: 'invalid_request' })
    const capped = ids.slice(0,10)
    const upstream = `${BASE}/api/trade/fetch/${capped.join(',')}?query=${encodeURIComponent(query)}`
    const r = await fetch(upstream, { headers: buildHeaders() })
    const text = await r.text()
    let json = null; try { json = JSON.parse(text) } catch {}
    if (!r.ok) return res.status(r.status).json({ error: 'upstream_error', status: r.status, body: text.slice(0,2000) })
    res.json({ result: json?.result || [] })
  } catch (e) {
    res.status(500).json({ error: 'proxy_failure', message: String(e) })
  }
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, session: !!argv.session, allowOrigin })
})

app.listen(argv.port, () => console.log(`[external-trade-proxy] listening on :${argv.port}`))
