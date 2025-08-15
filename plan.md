# Project Plan & Change Log

## Current Goal
Deliver a stable, realm + league aware poe.ninja style market viewer with persistent selection and safe caching.

## High-Level Objectives
- Accurate live data (no mock leagues)
- Low API pressure (>=10m currency/item cache)
- Clear UX: single league dropdown with current + previous grouping
- Secure OAuth (pending env migration)

## Active Tasks
| Status | Task | Notes |
|--------|------|-------|
| TODO | Move OAuth client secret out of client bundle | Use env + server route only |
| TODO | Add manual refresh button with last-updated timestamp | Per data block |
| TODO | Add error badge when an item category fetch returns empty | Assist debugging |
| TODO | Add lightweight Jest/Playwright smoke tests | League dropdown, persistence |
| TODO | Add SSF / Ruthless toggle filters if needed | Potential user request |
| TODO | Separate TTLs: currency 10m, items 15m, leagues 5m | Fine tune load |
| TODO | Introduce server-side revalidation strategy | `fetch` revalidate tags |
| TODO | OAuth env variable documentation | README update |

## Completed (Most Recent First)
| Date (UTC) | Change | Files |
|-----------|--------|-------|
| 2025-08-14 | Added persistence for realm & league; increased cache TTL to 10m | `league-selector.tsx`, `poe-api.ts` |
| 2025-08-14 | Simplified to single League dropdown, removed mock/historical injection | `league-selector.tsx`, `leagues/route.ts`, `page.tsx` |
| 2025-08-14 | Implemented broad leagues pagination & earlier historical injection (later removed) | `leagues/route.ts` |
| 2025-08-14 | Added fallback item overview fetch variants | `poe-api.ts` |
| 2025-08-14 | Added season/core separation (later reverted) | `league-selector.tsx`, `page.tsx` |
| 2025-08-14 | Fixed mapping for categories (Runegrafts, etc.) | `page.tsx`, `sidebar-nav.tsx` |
| 2025-08-14 | Added dynamic representative icons with realm cache | `sidebar-nav.tsx` |
| 2025-08-14 | Enlarged all icons (sidebar 32px, main 40px) & price grid 24px | multiple components/CSS |
| 2025-08-14 | Themed sidebar scrollbar | `globals.css` |
| 2025-08-14 | Added official league API proxy with pagination | `app/api/poe/leagues/route.ts` |
| 2025-08-14 | Made currency & item overview realm-aware | multiple components, `poe-api.ts` |
| 2025-08-14 | Added low-confidence filtering fallback | `currency-tracker.tsx` |

## Notes / Rationale
- Removed static historical injection to ensure pure API fidelity per request.
- Persistence implemented via localStorage to avoid adding backend state.
- Single dropdown mirrors poe.ninja simplicity; category.current used to group.
- Cache extension reduces upstream 401/429 risks.

## Next Step Candidates
1. Environment variable migration for OAuth config.
2. Manual refresh + stale timestamp overlay.
3. Unit test harness (Jest + React Testing Library) for persistence & mappings.
4. Graceful empty state messages for categories with zero results.

---
(Keep appending new entries above the Completed section chronologically.)
