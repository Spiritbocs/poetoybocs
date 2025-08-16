// Minimal Electron main file loading the live site only.
const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 1778,
    height: 1045,
    webPreferences: { contextIsolation: true }
  })
  const url = process.env.START_URL || 'https://poetoybocs.vercel.app'
  console.log('[electron] loading', url)
  win.webContents.on('did-fail-load', (_e, code, desc, failingUrl) => {
    console.error('did-fail-load', code, desc, failingUrl)
  })
  win.webContents.on('did-finish-load', () => console.log('did-finish-load'))
  win.loadURL(url)
}

app.whenReady().then(createWindow)
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
