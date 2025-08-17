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
    ? 'http://localhost:3000' 
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
    const sqlite3 = require('sqlite3').verbose()
    
    console.log('[detect-poe-session] Starting session auto-detection...')
    
    // Chrome/Edge cookie paths on Windows
    const browserPaths = [
      {
        name: 'Chrome',
        path: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cookies')
      },
      {
        name: 'Edge',
        path: path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cookies')
      }
    ]
    
    // Try to find POESESSID in browser cookies
    for (const browser of browserPaths) {
      if (fs.existsSync(browser.path)) {
        try {
          console.log(`[detect-poe-session] Checking ${browser.name} cookies...`)
          
          const sessionId = await new Promise((resolve, reject) => {
            // Create a temporary copy to avoid database lock issues
            const tempPath = browser.path + '.temp'
            fs.copyFileSync(browser.path, tempPath)
            
            const db = new sqlite3.Database(tempPath, sqlite3.OPEN_READONLY, (err) => {
              if (err) {
                console.log(`[detect-poe-session] ${browser.name} database error:`, err.message)
                resolve(null)
                return
              }
              
              // Query for POESESSID cookie
              db.get(
                "SELECT name, value FROM cookies WHERE host_key LIKE '%pathofexile.com%' AND name = 'POESESSID'",
                (err, row) => {
                  db.close()
                  
                  // Clean up temp file
                  try {
                    fs.unlinkSync(tempPath)
                  } catch (e) {
                    console.log('[detect-poe-session] Temp file cleanup failed:', e.message)
                  }
                  
                  if (err) {
                    console.log(`[detect-poe-session] ${browser.name} query error:`, err.message)
                    resolve(null)
                  } else if (row && row.value) {
                    console.log(`[detect-poe-session] Found POESESSID in ${browser.name}!`)
                    resolve(row.value)
                  } else {
                    console.log(`[detect-poe-session] No POESESSID found in ${browser.name}`)
                    resolve(null)
                  }
                }
              )
            })
          })
          
          if (sessionId) {
            return {
              success: true,
              sessionId: sessionId,
              method: `browser_auto_detect_${browser.name.toLowerCase()}`,
              message: `Auto-detected session from ${browser.name} browser`
            }
          }
          
        } catch (error) {
          console.log(`[detect-poe-session] Could not read ${browser.name} cookies:`, error.message)
        }
      } else {
        console.log(`[detect-poe-session] ${browser.name} not found at:`, browser.path)
      }
    }
    
    console.log('[detect-poe-session] No session found in any browser')
    return {
      success: false,
      method: 'manual',
      message: 'Auto-detection not available, manual session entry required'
    }
  } catch (error) {
    console.error('[detect-poe-session] Auto-detection failed:', error)
    return {
      success: false,
      error: error.message,
      method: 'manual',
      message: 'Auto-detection failed, manual session entry required'
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
