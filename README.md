<div align="center">
	<h1>PoE Market Tracker</h1>
	<p><strong>League / realm‑aware Path of Exile currency & item price viewer with poe.ninja style UI.</strong></p>
	<p>
		<a href="https://poetoybocs.vercel.app" target="_blank"><img alt="Vercel" src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel" /></a>
		<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript" />
		<img alt="Next.js" src="https://img.shields.io/badge/Next.js-14+-000000?logo=next.js" />
	</p>
</div>

## ✨ Features

- Realm + League aware pricing (PC / Xbox / PlayStation)
- Single league dropdown (current + previous) sourced live from official PoE API (`/league` endpoint)
- Currency exchange (Chaos ⇄ Divine reference, buy/sell style rows)
- Item overview tables for many poe.ninja categories (maps, uniques, fossils, essences, etc.)
- Dynamic representative sidebar icons fetched once per (realm, league)
- Auto‑filtering & search within item tables
- Low‑confidence filtering safeguards (avoids empty tables)
- Theme‑styled scrollbar & enlarged high‑visibility icons
- Persistent realm + league selection (localStorage)
- 10‑minute in‑memory caching of upstream calls to reduce load

## 🗂 Directory Structure

```
app/            # Next.js App Router entry
	api/          # Internal proxy endpoints (ninja + leagues + oauth)
	oauth/        # OAuth callback UI
	page.tsx      # Main layout + state orchestration
components/     # UI components (selectors, tables, sidebar, auth status)
lib/            # API abstraction (poe-api.ts)
public/         # Static assets / placeholder images
styles/         # Global and theme CSS
```

## 🔐 OAuth (Path of Exile)

The current implementation includes a client id & secret in `poe-api.ts` (to be moved server‑side before making the repo public). For local development you must register a matching redirect URI (e.g. `http://localhost:3000/oauth/callback`) or use the production Vercel URL.

Recommended next hardening steps (NOT yet implemented):
1. Move OAuth config to environment variables (`NEXT_PUBLIC_POE_CLIENT_ID`, backend secret only for token exchange route).
2. Remove the client secret from any code that runs in the browser (PKCE suffices).
3. Separate dev & prod app registrations.

## 🚀 Getting Started

```bash
pnpm install   # or npm install / yarn install
pnpm dev       # start Next.js on http://localhost:3000
```

Open the site, pick Realm + League; selections persist until storage cleared.

## 🔄 Data Sources

| Source | Purpose | Internal Proxy |
| ------ | ------- | -------------- |
| Official PoE API `/league` | Live league list (current & previous) | `app/api/poe/leagues` |
| poe.ninja `currencyoverview` | Currency & fragment prices | `app/api/ninja/currency` |
| poe.ninja `itemoverview` | Item category prices | `app/api/ninja/items` |

## 🧠 Caching Strategy

- Client in‑memory map (10 min TTL) inside `poe-api.ts` keyed by: `currency-${realm}-${league}-${type}` & `itemOverview-${realm}-${league}-${type}`.
- Server proxy mini caches (2–5 min) to shield poe.ninja & PoE endpoints.

## 🖥 Environment Variables (planned)

| Variable | Description |
| -------- | ----------- |
| NEXT_PUBLIC_POE_CLIENT_ID | OAuth client id (public) |
| POE_CLIENT_SECRET | Server‑side secret used only by token route |
| NEXT_PUBLIC_REDIRECT_URI | OAuth redirect (matches registration) |

## 📦 Adding Categories

Item categories map via `sectionToItemType` (in `app/page.tsx`) & `mapKeyToType` (in `sidebar-nav.tsx`). Add the key + poe.ninja type and the UI will fetch automatically.

## 🛠 Development Notes

- Increase / decrease icon sizes centrally in component styles.
- Adjust cache TTL in `lib/poe-api.ts` (`cacheTimeout`).
- To force refresh: clear site storage (DevTools > Application > Clear storage) or restart dev server.

## 🧪 Testing (Manual for now)

1. Load site; verify league dropdown lists current & previous leagues.
2. Switch realm; ensure list reloads & selection persists across reloads.
3. Choose categories in sidebar; tables populate with icons & prices.
4. Hard reload; previous league + realm restored.

## 📄 License

Currently PRIVATE. License to be chosen before making repository public.

## 🗺 Roadmap (See `plan.md` for live task log)

- [ ] Move OAuth credentials to env
- [ ] Manual refresh button / stale indicator
- [ ] Split cache TTL per data type
- [ ] Error badges for empty categories
- [ ] Basic automated tests

---
If you publish the repository later, scrub secrets and finalize a license first.
