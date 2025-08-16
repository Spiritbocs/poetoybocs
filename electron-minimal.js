// Minimal test launcher to verify remote site loads without custom logic.
// Run: npx electron electron-minimal.js
const { app, BrowserWindow } = require('electron')

function create() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: { contextIsolation: true }
  })

  const target = process.env.MIN_URL || 'https://poetoybocs.vercel.app'
  console.log('Loading', target)
  win.webContents.on('did-finish-load', () => console.log('did-finish-load'))
  win.webContents.on('dom-ready', () => console.log('dom-ready'))
  win.webContents.on('did-fail-load', (e, code, desc, url) => console.error('did-fail-load', code, desc, url))
  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log('[console]', level, message, sourceId + ':' + line)
  })
  win.webContents.setWindowOpenHandler(details => ({ action: 'deny' }))
  win.loadURL(target, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36' })
}
app.whenReady().then(create)
app.on('window-all-closed', () => app.quit())
