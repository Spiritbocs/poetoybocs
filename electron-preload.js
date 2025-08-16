// Enhanced preload script for desktop PoE tool
// Exposes secure desktop APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron')

// Mask automation detection for better PoE API compatibility
try {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
} catch {}

// Expose desktop APIs to renderer through contextBridge (secure)
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Direct PoE API access (bypasses CORS and IP blocking)
  poeApiRequest: (url, options) => ipcRenderer.invoke('poe-api-request', { url, options }),
  
  // Desktop-specific PoE session management
  detectPoeSession: () => ipcRenderer.invoke('detect-poe-session'),
  openPoeTradeInBrowser: (league) => ipcRenderer.invoke('open-poe-trade', league),
  
  // Local data storage (better than localStorage)
  saveUserData: (key, data) => ipcRenderer.invoke('save-user-data', { key, data }),
  loadUserData: (key) => ipcRenderer.invoke('load-user-data', { key }),
  
  // Platform detection
  platform: process.platform,
  isDesktop: true,
  
  // Legacy compatibility
  version: '2.0.0-desktop',
  openPoEAuth: async () => ipcRenderer.invoke('open-poe-auth').catch(() => null),
  oauthOpen: async (authUrl) => ipcRenderer.invoke('oauth-open', authUrl)
})

// Mark as desktop app for components
contextBridge.exposeInMainWorld('isElectron', true)

console.log('[preload] Desktop APIs exposed to renderer')
