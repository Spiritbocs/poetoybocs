# PoE Toy Bocs 🎮

A comprehensive Path of Exile desktop information tool inspired by PoE Overlay. Get real-time item pricing, character builds, atlas progression, and market data - all in one desktop application.

![PoE Toy Bocs](./public/placeholder-logo.png)

## ✨ Features

### 🔍 **Item & Market Information**
- **Real-time Item Pricing** - Instant valuations using PoE trade API
- **Currency Exchange Rates** - Live currency conversion and tracking
- **Market Analysis** - Advanced search and filtering tools
- **Price History** - Trends and market analysis

### 👤 **Character & Build Tools**
- **Character Inspector** - View builds, equipment, and stats
- **Multi-Character Support** - Switch between all your characters
- **Skill Tree Viewer** - Allocated passive points and build analysis
- **Gear Analysis** - Equipment optimization suggestions

### 🗺️ **Atlas & Progression**
- **Atlas Completion Tracking** - Monitor your atlas progress
- **Map Bonus Overview** - Track completion bonuses
- **Atlas Passive Tree** - View allocated atlas passives
- **Progress Statistics** - Detailed progression metrics

### 💻 **Desktop Advantages**
- **Auto-Session Detection** - Automatically detect PoE sessions from browser
- **Direct API Access** - No CORS limitations or proxy servers
- **Offline Mode** - Cached data when disconnected
- **Native Performance** - Fast, responsive desktop experience

## 🚀 Quick Start

### Download & Install
1. Download the latest release for your platform from [Releases](https://github.com/Spiritbocs/poetoybocs/releases)
2. Install the application:
   - **Windows**: Run the `.exe` installer
   - **macOS**: Mount the `.dmg` and drag to Applications
   - **Linux**: Install the `.AppImage`, `.deb`, or `.rpm` package

### First Time Setup
1. **Launch the app** - PoE Toy Bocs will open in a 1778x1045 window
2. **Session Detection** - The app will attempt to auto-detect your PoE session from browser cookies
3. **Optional Account Connection** - Connect your PoE account for character data (OAuth)
4. **Select League** - Choose your current league
5. **Start Exploring** - Begin using item pricing and character tools!

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/Spiritbocs/poetoybocs.git
cd poetoybocs

# Install dependencies
npm install

# Start Next.js development server
npm run dev

# In another terminal, start the desktop app
npm run dev:electron
```

### Build for Production
```bash
# Build the Next.js app
npm run build

# Build desktop applications for all platforms
npm run electron:build

# Build for current platform only
npm run electron:dist
```

## 🔐 Authentication

PoE Toy Bocs uses a dual authentication system for maximum functionality:

### Session Management (Required for Pricing)
- **POESESSID Cookie** - Automatically detected from your browser
- **Manual Entry** - Copy session ID if auto-detection fails
- **Purpose** - Access trade API for item pricing and market data

### OAuth Connection (Optional for Character Data)
- **PoE Account Integration** - Connect your official PoE account
- **Purpose** - Access character builds, atlas progression, passive trees
- **Privacy** - Only reads public character data, never modifies anything

## 📋 Project Status

### Current Phase: Desktop Foundation
- ✅ Basic desktop app structure
- ✅ OAuth authentication system  
- ✅ Currency tracking functionality
- ✅ Item price checking (basic)
- 🔄 Desktop mode testing and validation
- 🔄 Enhanced session detection

### Upcoming Features
- 📋 Character data integration
- 📋 Atlas progression tracking
- 📋 Enhanced item evaluation tools
- 📋 Performance optimization

See our [Development Plan](./PLAN_V2.md) and [Kanban Board](./KANBAN.md) for detailed roadmap.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Report Bugs
Use our [Bug Report Template](./.github/ISSUE_TEMPLATE/bug_report.md) to report issues.

### 💡 Request Features  
Use our [Feature Request Template](./.github/ISSUE_TEMPLATE/feature_request.md) to suggest new features.

### 👨‍💻 Contribute Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📊 Development Workflow
We use a kanban board to track development. Check our [GitHub Projects](https://github.com/Spiritbocs/poetoybocs/projects) to see current work and pick up tasks.

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 14 + Electron
- **Language**: TypeScript
- **UI**: React + Tailwind CSS
- **APIs**: PoE Official API (OAuth + Trade)
- **Desktop**: Electron with secure IPC
- **Build**: electron-builder for cross-platform

### Key Components
```
├── electron-main.js          # Main Electron process
├── electron-preload.js       # Secure IPC bridge  
├── app/                      # Next.js application
├── components/               # React components
├── lib/                      # Utilities and API clients
└── .github/                  # CI/CD and project templates
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Path of Exile** - Amazing game by Grinding Gear Games
- **PoE Overlay** - Inspiration for desktop tool design
- **Awakened PoE Trade** - Session management approach
- **PoE Community** - Feedback and feature suggestions

## 🔗 Links

- **Issues**: [GitHub Issues](https://github.com/Spiritbocs/poetoybocs/issues)
- **Releases**: [GitHub Releases](https://github.com/Spiritbocs/poetoybocs/releases)
- **Project Board**: [GitHub Projects](https://github.com/Spiritbocs/poetoybocs/projects)
- **PoE API**: [Official PoE API](https://www.pathofexile.com/developer/docs)

---

**Made with ❤️ for the Path of Exile community**

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
