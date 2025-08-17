# PoE Toy Bocs - Development Kanban Board

> **📌 Auto-Sync Enabled**: This markdown file automatically syncs with GitHub Issues!  
> **🔄 To sync manually**: Run `sync-kanban.bat` or see [automation setup](#automation-setup) below.

## 🎯 Current Sprint Focus

### 🔥 **Phase 2 Active** (Character Data Integration)
**Goal**: Complete character management and begin equipment integration

**Recently Completed**:
- ✅ Desktop app loading and UI visibility (**COMPLETED**)
- ✅ **Session auto-detection enhancement** (sqlite3 browser cookies - **COMPLETED**)
- ✅ **OAuth desktop mode validation** (test authentication flow - **COMPLETED**)
- ✅ **Character Data API Integration** (**COMPLETED**)
- ✅ **Character Selector Component** (**COMPLETED**)

**Currently Working**:
- 🔄 **Equipment and Gear Viewer** (Phase 2 continuation)
- 🔄 **Skill Tree and Gems Display** (Phase 2 continuation)

**Next Up**:
- 🎯 **Atlas Progression Tracking** (Phase 3 - Ready to plan)

### 📋 **Quick Actions** (Choose One to Start)
1. **Character API** - Add PoE character endpoints for OAuth-based character data
2. **Character UI** - Create character switching dropdown/selector component  
3. **Session Enhancement** - Improve POESESSID auto-detection from browser cookies
4. **Atlas Planning** - Research atlas progression API endpoints for future phases

---

## 📋 Project Structure for GitHub Projects

### Columns
1. **📝 Backlog** - Future features and ideas
2. **🎯 Ready** - Defined tasks ready for development
3. **🔄 In Progress** - Currently being worked on
4. **👀 Review** - Completed, pending testing/review
5. **✅ Done** - Completed and verified

### Labels
- **Phase Labels:**
  - `phase-1-foundation` - Desktop foundation work
  - `phase-2-characters` - Character and build features
  - `phase-3-atlas` - Atlas and progression features
  - `phase-4-evaluation` - Enhanced evaluation tools
  - `phase-5-polish` - Final polish and distribution

- **Priority Labels:**
  - `priority-critical` - Blocking other work
  - `priority-high` - Important for UX
  - `priority-medium` - Nice to have
  - `priority-low` - Future enhancement

- **Type Labels:**
  - `feature` - New functionality
  - `bug` - Bug fixes
  - `task` - Development tasks
  - `enhancement` - Improvements
  - `documentation` - Docs and guides

- **Component Labels:**
  - `component-auth` - Authentication system
  - `component-desktop` - Electron/desktop features
  - `component-ui` - User interface
  - `component-api` - API integration
  - `component-data` - Data management

---

## 🚀 Initial Issues to Create

### Phase 1: Desktop Foundation

#### Ready for Development
1. **[TASK] Fix desktop app file path loading** ✅ COMPLETED
   - Labels: `task`, `phase-1-foundation`, `priority-critical`, `component-desktop`
   - ~~Fix electron-main.js path issues and validate desktop mode~~

2. **[TASK] Fix desktop app dark theme colors** ✅ COMPLETED
   - Labels: `task`, `phase-1-foundation`, `priority-critical`, `component-ui`
   - ~~Fix white text on white background visibility issues~~

3. **[TASK] Enhance session auto-detection** ✅
   - Labels: `task`, `phase-1-foundation`, `priority-high`, `component-auth`
   - Status: COMPLETED - sqlite3 browser cookie reading implemented

4. **[TASK] Test and validate OAuth in desktop mode** ✅
   - Labels: `task`, `phase-1-foundation`, `priority-high`, `component-auth`
   - Status: COMPLETED - OAuth flow working in Electron

### Phase 2: Character & Build System

#### Completed ✅
5. **[FEATURE] Character data API integration** ✅
   - Labels: `feature`, `phase-2-characters`, `priority-high`, `component-api`
   - Status: COMPLETED - Character API endpoints integrated with caching
   - **Tasks**: ✅ Add character list endpoint, ✅ individual character detail API, ✅ character equipment/stats parsing

6. **[FEATURE] Character selector component** ✅
   - Labels: `feature`, `phase-2-characters`, `priority-high`, `component-ui`
   - Status: COMPLETED - Multi-character switching interface implemented
   - **Tasks**: ✅ Character dropdown UI, ✅ character context state management, ✅ character switching logic

#### In Development
7. **[FEATURE] Equipment and gear viewer**
   - Labels: `feature`, `phase-2-characters`, `priority-medium`, `component-ui`
   - Display character equipment and stats
   - **Tasks**: Equipment slot display, item tooltips, stat calculations

8. **[FEATURE] Skill tree and gems display**
   - Labels: `feature`, `phase-2-characters`, `priority-medium`, `component-ui`
   - Show allocated passive points and skill gems
   - **Tasks**: Passive tree visualization, skill gem display, build summary

9. **[FEATURE] Character builds analyzer**
   - Labels: `feature`, `phase-2-characters`, `priority-low`, `component-ui`
   - Analyze and compare character builds
   - **Tasks**: Build comparison, DPS calculations, gear recommendations

### Phase 3: Atlas & Progression

#### Ready for Planning
10. **[FEATURE] Atlas progression tracking**
    - Labels: `feature`, `phase-3-atlas`, `priority-medium`, `component-api`
    - Track atlas completion and bonuses
    - **Tasks**: Atlas completion API, bonus tracking, progress statistics

11. **[FEATURE] Atlas viewer component**
    - Labels: `feature`, `phase-3-atlas`, `priority-medium`, `component-ui`
    - Visual atlas progression display
    - **Tasks**: Atlas map visualization, completion indicators, bonus displays

12. **[FEATURE] Atlas passive tree viewer**
    - Labels: `feature`, `phase-3-atlas`, `priority-low`, `component-ui`
    - Display atlas passive allocations
    - **Tasks**: Atlas passive tree display, point allocation viewer, strategy suggestions

### Phase 4: Enhanced Evaluation

#### Ready for Planning
13. **[FEATURE] Enhanced item evaluation tools**
    - Labels: `feature`, `phase-4-evaluation`, `priority-high`, `component-ui`
    - Advanced pricing tools and item analysis
    - **Tasks**: Advanced filtering, comparison tools, price prediction, market trends

14. **[FEATURE] Advanced item evaluation filters**
    - Labels: `feature`, `phase-4-evaluation`, `priority-medium`, `component-ui`
    - Enhanced filtering for item evaluation
    - **Tasks**: Custom filters, saved searches, filter presets

15. **[FEATURE] Item comparison tools**
    - Labels: `feature`, `phase-4-evaluation`, `priority-medium`, `component-ui`
    - Side-by-side item comparison
    - **Tasks**: Comparison interface, stat differences, upgrade recommendations

16. **[FEATURE] Price history and trends**
    - Labels: `feature`, `phase-4-evaluation`, `priority-low`, `component-data`
    - Historical price data visualization
    - **Tasks**: Price charts, trend analysis, market predictions
    - Labels: `feature`, `phase-4-evaluation`, `priority-medium`, `component-ui`
    - Enhanced filtering for item evaluation

13. **[FEATURE] Item comparison tools**
    - Labels: `feature`, `phase-4-evaluation`, `priority-low`, `component-ui`
    - Side-by-side item comparison

14. **[FEATURE] Price history and trends**
    - Labels: `feature`, `phase-4-evaluation`, `priority-low`, `component-data`
    - Historical price data visualization

### Phase 5: Polish & Distribution

#### Backlog (Final Phase)
15. **[TASK] Performance optimization**
    - Labels: `task`, `phase-5-polish`, `priority-medium`, `component-desktop`
    - Optimize app performance and memory usage

16. **[TASK] Auto-updater implementation**
    - Labels: `task`, `phase-5-polish`, `priority-high`, `component-desktop`
    - Implement seamless app updates

17. **[TASK] Cross-platform testing**
    - Labels: `task`, `phase-5-polish`, `priority-high`, `component-desktop`
    - Test on Windows, macOS, Linux

18. **[TASK] Release automation and CI/CD**
    - Labels: `task`, `phase-5-polish`, `priority-medium`, `component-desktop`
    - Automated builds and releases

---

## 📊 Milestone Structure

### Milestone 1: Desktop Foundation (v0.2.0) - 🎯 IN PROGRESS
- ✅ Desktop app loads correctly 
- ✅ Desktop window sizing (1778x1045)
- ✅ Dark theme and UI visibility fixed
- 🔄 Session management working
- 🔄 OAuth integration verified  
- ✅ Basic functionality ported (currency tracker, item pricing)

### Milestone 2: Character System (v0.3.0) - 📋 READY TO START
- **[FEATURE] Character data API integration** - High Priority
- **[FEATURE] Character selector component** - High Priority  
- Character equipment and gear viewer
- Skill tree and gems display
- Character build analysis tools

### Milestone 3: Atlas Integration (v0.4.0) - 📋 PLANNED
- **[FEATURE] Atlas progression tracking** - Medium Priority
- **[FEATURE] Atlas viewer component** - Medium Priority
- Atlas passive tree viewer
- Completion statistics and bonuses

### Milestone 4: Enhanced Tools (v0.5.0) - 📋 PLANNED  
- **[FEATURE] Enhanced item evaluation tools** - High Priority
- **[FEATURE] Advanced item evaluation filters** - Medium Priority
- **[FEATURE] Item comparison tools** - Medium Priority
- **[FEATURE] Price history and trends** - Low Priority

### Milestone 5: Production Release (v1.0.0) - 📋 FUTURE
- Performance optimized
- Auto-updater working
- Cross-platform tested  
- Release automation

---

## 🎯 How to Use This Board

### For Developers
1. Pick issues from "Ready" column
2. Move to "In Progress" when starting
3. Move to "Review" when code complete
4. Move to "Done" after testing/validation

### For Planning
1. Add new ideas to "Backlog"
2. Refine and detail items to move to "Ready"
3. Prioritize based on phase and user needs
4. Track progress through milestones

### For Users
1. Create feature requests and bug reports
2. Vote on important features
3. Track development progress
4. Provide feedback on completed features

---

## 🔄 Automation Setup

### Auto-Sync KANBAN.md → GitHub Issues

This kanban board automatically creates GitHub Issues from the markdown file.

#### Method 1: Automatic (GitHub Actions)
- Syncs automatically when KANBAN.md is updated
- No manual setup required
- Issues are created with proper labels and milestones

#### Method 2: Manual Sync (Windows)
```batch
# Set your GitHub token (one-time setup)
set GITHUB_TOKEN=your_personal_access_token

# Run the sync script
sync-kanban.bat
```

#### Method 3: Manual Sync (Python)
```bash
# Install dependencies
pip install PyGithub

# Set environment variables
export GITHUB_TOKEN=your_personal_access_token
export GITHUB_REPO=Spiritbocs/poetoybocs

# Run sync script
python scripts/sync-kanban.py
```

### Creating GitHub Personal Access Token
1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full repository access)
4. Copy the token and set it as environment variable

### How It Works
- **Parses** numbered items from KANBAN.md
- **Creates** GitHub Issues with proper labels and titles
- **Avoids duplicates** by checking existing issues
- **Maintains sync** between documentation and project board

### Labels Auto-Generated
- `phase-X-name` - Development phase
- `priority-level` - Issue priority  
- `component-type` - Component category
- `kanban-sync` - Auto-synced from markdown
