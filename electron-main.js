// Full-featured Electron main process for desktop PoE tool
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1778,
    height: 1045,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    icon: path.join(__dirname, 'public', 'placeholder-logo.png'), // App icon
    title: 'PoE Toy Bocs - Desktop',
    show: false // Don't show until ready
  })

  // Load the built Next.js app locally instead of web version
  const isDev = process.env.NODE_ENV === 'development'
  const startUrl = isDev 
    ? 'http://localhost:3001' 
    : 'https://poetoybocs.vercel.app' // Fallback to web version for now
  
  console.log('[electron] App ready, version:', app.getVersion())
  console.log('[electron] Environment:', isDev ? 'development' : 'production')
  console.log('[electron] loading', startUrl)
  
  mainWindow.loadURL(startUrl)
  
  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle navigation (security)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    // Allow navigation to PoE website for login
    if (parsedUrl.origin === 'https://www.pathofexile.com') {
      return // Allow PoE website
    }
    
    // Block all other external navigation
    if (parsedUrl.origin !== startUrl) {
      event.preventDefault()
    }
  })
}

// IPC handlers for desktop-specific features
ipcMain.handle('poe-api-request', async (event, { url, options }) => {
  try {
    // Desktop apps can make direct API calls without CORS issues
    const fetch = require('node-fetch')
    const response = await fetch(url, options)
    const data = await response.text()
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: data
    }
  } catch (error) {
    return {
      ok: false,
      error: error.message
    }
  }
})

// Auto-detect PoE session from browser cookies (like Awakened PoE Trade)
ipcMain.handle('detect-poe-session', async () => {
  try {
    const os = require('os')
    const path = require('path')
    
    // Chrome/Edge cookie paths on Windows
    const chromePaths = [
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cookies'),
      path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cookies')
    ]
    
    // Try to find POESESSID in browser cookies
    for (const cookiePath of chromePaths) {
      if (fs.existsSync(cookiePath)) {
        try {
          // Note: Real implementation would use sqlite3 to read Chrome cookies
          // For now, return a placeholder that indicates auto-detection is available
          return {
            success: true,
            method: 'browser_auto_detect',
            message: 'Desktop app can auto-detect session (feature in development)'
          }
        } catch (error) {
          console.log('[poe-session] Could not read cookies from:', cookiePath)
        }
      }
    }
    
    return {
      success: false,
      method: 'manual',
      message: 'Auto-detection not available, manual session entry required'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

// Open PoE trade in system browser for easy session copying
ipcMain.handle('open-poe-trade', async (event, league = 'Mercenaries') => {
  try {
    const { shell } = require('electron')
    const url = `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('save-user-data', async (event, { key, data }) => {
  try {
    const userDataPath = app.getPath('userData')
    const filePath = path.join(userDataPath, `${key}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-user-data', async (event, { key }) => {
  try {
    const userDataPath = app.getPath('userData')
    const filePath = path.join(userDataPath, `${key}.json`)
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    }
    
    return { success: false, error: 'File not found' }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// App event handlers
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Handle app updates (for future auto-updater)
app.on('ready', () => {
  console.log('[electron] App ready, version:', app.getVersion())
})
