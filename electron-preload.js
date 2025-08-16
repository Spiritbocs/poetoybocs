// Preload script: can expose limited APIs to renderer if needed.
// Intentionally no nodeIntegration in renderer for security.

const { contextBridge, ipcRenderer } = require('electron')

// Mask automation (some CF checks look for webdriver flag)
try {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
} catch {}

contextBridge.exposeInMainWorld('poeApp', {
  version: '1.0.0',
  openPoEAuth: async () => ipcRenderer.invoke('open-poe-auth').catch(()=>null),
  oauthOpen: async (authUrl) => ipcRenderer.invoke('oauth-open', authUrl)
})
