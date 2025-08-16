# PoE Toy Bocs - Comprehensive Desktop App Plan

## 🎯 Vision
A complete Path of Exile desktop information tool inspired by PoE Overlay - providing item evaluation, character builds, atlas progression, passive tree viewing, and market data without trading functionality.

## 🏗️ Architecture

### Desktop-First Approach
- **Platform**: Electron desktop application
- **Target**: Windows, macOS, Linux distribution
- **Distribution**: GitHub Releases with auto-updater
- **Window Size**: 1778x1045 (optimized for PoE overlay usage)

### Technical Stack
- **Framework**: Next.js 14 + Electron
- **UI**: React, TypeScript, Tailwind CSS
- **APIs**: PoE Official API (OAuth + Trade API)
- **Storage**: Local file system + localStorage
- **Build**: electron-builder for cross-platform

## 🔐 Authentication Strategy

### Dual Authentication System
1. **OAuth Connection** (for account data)
   - Character builds, gear, skills
   - Atlas progression, passive trees
   - League challenges, stash access
   
2. **Session Management** (for market data)
   - POESESSID cookie (auto-detected from browser)
   - Item pricing, currency rates
   - Trade search capabilities

## 📋 Feature Breakdown

### Core Information Features
- ✅ **Currency Tracker** - Live rates, historical data
- ✅ **Item Price Checker** - Real-time valuations
- 🔄 **Character Inspector** - Builds, gear, skills overview
- 🔄 **Atlas Viewer** - Progression, completion tracking
- 🔄 **Passive Tree Viewer** - Allocated points, build analysis
- ✅ **Wiki Integration** - Item lookup and information

### Market & Evaluation
- 🔄 **Item Evaluation** - Comprehensive pricing with filters
- ✅ **Market Search** - Advanced item/currency search
- 🔄 **Bulk Exchange** - Currency conversion tools
- 🔄 **Price History** - Trends and market analysis

### User Experience
- 🔄 **Multi-Character Support** - Switch between characters
- 🔄 **League Selection** - Support all active leagues
- 🔄 **Offline Mode** - Cached data when disconnected
- 🔄 **Auto-Updates** - Seamless app updates

## 🚀 Development Phases

### Phase 1: Desktop Foundation (Current)
**Goal**: Stable desktop app with existing features
- [x] Electron setup and configuration
- [x] Desktop-specific APIs and IPC
- [x] Session management (POESESSID)
- [x] OAuth integration for desktop
- [ ] Test and validate desktop mode
- [ ] Fix any desktop-specific issues

### Phase 2: Character & Build System
**Goal**: Character information like PoE Overlay
- [ ] Character data API integration
- [ ] Character selector component
- [ ] Equipment/gear viewer
- [ ] Skill tree display
- [ ] Character stats and details

### Phase 3: Atlas & Progression
**Goal**: Atlas and progression tracking
- [ ] Atlas data API integration
- [ ] Atlas completion viewer
- [ ] Map bonus tracking
- [ ] Atlas passive tree viewer
- [ ] Progress statistics

### Phase 4: Enhanced Evaluation
**Goal**: Advanced item evaluation tools
- [ ] Enhanced item parser
- [ ] Advanced pricing filters
- [ ] Comparison tools
- [ ] Value estimation algorithms
- [ ] Price prediction features

### Phase 5: Polish & Distribution
**Goal**: Production-ready application
- [ ] Performance optimization
- [ ] Error handling and logging
- [ ] Auto-updater implementation
- [ ] Cross-platform testing
- [ ] Release automation

## 📊 Component Architecture

### Core Components
```
app/
├── page.tsx                 # Main dashboard
├── characters/             # Character management
│   ├── page.tsx           # Character list/selector
│   └── [id]/              # Individual character view
├── atlas/                 # Atlas progression
│   ├── page.tsx           # Atlas overview
│   └── passive-tree/      # Atlas passive tree
├── evaluation/            # Item evaluation tools
└── settings/              # App configuration

components/
├── auth-status.tsx        # OAuth authentication
├── desktop-session-manager.tsx  # POESESSID management
├── character-viewer.tsx   # Character display
├── atlas-viewer.tsx      # Atlas progression
├── passive-tree.tsx      # Passive tree display
├── item-evaluator.tsx    # Enhanced item evaluation
└── market-tools.tsx      # Market analysis tools
```

### Desktop APIs
```
electron-main.js           # Main process with APIs
├── poe-api-request       # Direct API calls
├── detect-poe-session    # Browser cookie detection
├── save/load-user-data   # Local data persistence
├── open-poe-trade        # External browser integration
└── character-data        # Character information APIs
```

## 🎮 User Workflows

### First-Time Setup
1. Launch desktop app
2. **Quick Setup**: Auto-detect POESESSID from browser
3. **Optional**: Connect PoE account for character data
4. Select main character and league
5. Start using features immediately

### Daily Usage
1. App auto-detects current session
2. Character/league context maintained
3. Item evaluation via price checker
4. Character progression tracking
5. Atlas completion monitoring

### Power User Features
1. Multi-character switching
2. Historical data analysis
3. Advanced item filtering
4. Custom evaluation criteria
5. Export/import settings

## 🔄 Data Flow

### Market Data (Session-based)
```
User Session → Desktop API → PoE Trade API → Price Data → UI
```

### Character Data (OAuth-based)
```
OAuth Token → Desktop API → PoE Account API → Character Data → UI
```

### Caching Strategy
- **Market Data**: 5-minute cache, background refresh
- **Character Data**: 30-minute cache, manual refresh
- **Static Data**: Local storage, weekly updates

## 📈 Success Metrics

### Technical Goals
- App startup time < 3 seconds
- API response time < 500ms
- Memory usage < 200MB
- Support for all major PoE leagues

### User Experience Goals
- Single-click item evaluation
- Auto-detection success rate > 80%
- Zero-configuration setup for basic features
- Comprehensive character information display

## 🚦 Current Status

### Completed ✅
- Basic desktop app structure
- OAuth authentication system
- Currency tracking functionality
- Item price checking (basic)
- Session management framework

### In Progress 🔄
- Desktop mode testing and validation
- Enhanced session detection
- Character data integration

### Next Up 📋
- Character viewer implementation
- Atlas progression tracking
- Enhanced item evaluation tools

## 📝 Notes

### Design Philosophy
- **Information over Trading**: Focus on data display, not transaction facilitation
- **Desktop Advantage**: Leverage desktop capabilities (file access, direct APIs, no CORS)
- **PoE Overlay Inspiration**: Similar feature set, modern tech stack
- **User-Centric**: Minimal setup, maximum information value

### Development Approach
- **Incremental**: Build and test each feature independently
- **Desktop-First**: Optimize for desktop experience
- **API Efficiency**: Cache aggressively, batch requests
- **Error Resilience**: Graceful degradation when APIs are unavailable
