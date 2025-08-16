#!/usr/bin/env node

/**
 * GitHub Issues Creator for PoE Toy Bocs
 * 
 * This script helps create the initial issues for the GitHub project board.
 * Run this after setting up the GitHub repository to populate the kanban board.
 * 
 * Prerequisites:
 * - GitHub CLI installed (gh auth login)
 * - Repository should be pushed to GitHub
 * 
 * Usage:
 * node create-github-issues.js
 */

const { execSync } = require('child_process');

const issues = [
  // Phase 1: Desktop Foundation
  {
    title: '[TASK] Fix desktop app file path loading',
    body: `## 📋 Task Description
Fix the file path issues in electron-main.js and validate desktop mode functionality.

## 🎯 Goals
- [ ] Fix electron app startup and loading
- [ ] Validate Next.js integration with Electron
- [ ] Test desktop window creation and sizing
- [ ] Ensure proper dev/prod environment handling

## 🔧 Technical Details
- File: electron-main.js
- Issue: File path resolution for Next.js app
- Need to handle dev vs production loading correctly
- Window size: 1778x1045

## ✅ Definition of Done
- [ ] Desktop app starts without errors
- [ ] Next.js app loads correctly in Electron window
- [ ] Dev tools accessible in development mode
- [ ] Production mode loads from correct source`,
    labels: ['task', 'phase-1-foundation', 'priority-critical', 'component-desktop']
  },
  
  {
    title: '[TASK] Enhance session auto-detection',
    body: `## 📋 Task Description
Implement proper browser cookie reading for POESESSID auto-detection.

## 🎯 Goals
- [ ] Add sqlite3 dependency for Chrome cookie reading
- [ ] Implement actual cookie parsing logic
- [ ] Support multiple browser types (Chrome, Edge, Firefox)
- [ ] Handle encrypted cookies properly

## 🔧 Technical Details
- Add sqlite3 to dependencies
- Implement browser cookie database reading
- Update detect-poe-session IPC handler
- Handle cookie encryption/decryption

## ✅ Definition of Done
- [ ] POESESSID auto-detection works from browser cookies
- [ ] Supports major browsers on Windows
- [ ] Graceful fallback to manual entry
- [ ] No security vulnerabilities in cookie access`,
    labels: ['task', 'phase-1-foundation', 'priority-high', 'component-auth']
  },

  {
    title: '[FEATURE] Character data API integration', 
    body: `## 📋 Feature Description
Integrate PoE character API endpoints to display character information.

## 🔍 Use Case
Users want to see their character builds, equipment, skills, and stats within the desktop app.

## 💡 Proposed Solution
- Implement character API calls using OAuth tokens
- Add character data caching and management
- Create character data models and types

## 📋 Acceptance Criteria
- [ ] Character list API integration
- [ ] Individual character detail API
- [ ] Character equipment and stats
- [ ] Skill gems and passive tree data
- [ ] Proper error handling and caching

## 🎮 PoE Context
- [x] Character data (OAuth required)
- [ ] Trade/market data (Session required)
- [ ] Static game data
- [ ] UI/UX improvement
- [ ] Desktop-specific feature`,
    labels: ['feature', 'phase-2-characters', 'priority-high', 'component-api']
  },

  {
    title: '[FEATURE] Character selector component',
    body: `## 📋 Feature Description
Create a character selector component for switching between multiple characters.

## 🔍 Use Case
Users with multiple characters need an easy way to switch context and view different character information.

## 💡 Proposed Solution
- Dropdown or tabbed interface for character selection
- Display character name, class, level
- Persist selected character preference
- Show character portraits/icons

## 📋 Acceptance Criteria
- [ ] Character dropdown/selector UI
- [ ] Character switching functionality
- [ ] Selected character persistence
- [ ] Character context propagation
- [ ] Loading states and error handling

## 🎮 PoE Context
- [x] Character data (OAuth required)
- [ ] Trade/market data (Session required)
- [ ] Static game data
- [x] UI/UX improvement
- [ ] Desktop-specific feature`,
    labels: ['feature', 'phase-2-characters', 'priority-high', 'component-ui']
  }
];

async function createIssues() {
  console.log('🚀 Creating GitHub issues for PoE Toy Bocs...\n');
  
  for (const issue of issues) {
    try {
      const labelArgs = issue.labels.map(label => `--label "${label}"`).join(' ');
      const command = `gh issue create --title "${issue.title}" --body "${issue.body}" ${labelArgs}`;
      
      console.log(`📝 Creating: ${issue.title}`);
      execSync(command, { stdio: 'inherit' });
      console.log('✅ Created successfully\n');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error creating issue: ${issue.title}`);
      console.error(error.message);
    }
  }
  
  console.log('🎉 All issues created! Check your GitHub repository.');
  console.log('💡 Next steps:');
  console.log('1. Create a GitHub Project board');
  console.log('2. Add these issues to the project');
  console.log('3. Organize issues into columns (Backlog, Ready, In Progress, etc.)');
}

// Check if GitHub CLI is available
try {
  execSync('gh --version', { stdio: 'ignore' });
  createIssues();
} catch (error) {
  console.error('❌ GitHub CLI not found. Please install it first:');
  console.error('https://cli.github.com/');
  console.error('\nThen run: gh auth login');
  process.exit(1);
}
