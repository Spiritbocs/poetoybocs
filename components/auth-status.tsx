"use client"

import { useState, useEffect } from "react"
import { poeApi } from "@/lib/poe-api"

export function AuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [accountName, setAccountName] = useState<string | null>(null)

  useEffect(() => {
    // Check for stored token on component mount
    const hasToken = poeApi.loadStoredToken()
    setIsAuthenticated(hasToken)
    const loadProfile = async () => {
      if (hasToken) {
        const cached = poeApi.getCachedProfile()
        if (cached?.name) setAccountName(cached.name)
        const profile = await poeApi.getProfile(false)
        if (profile?.name) setAccountName(profile.name)
      }
      setIsLoading(false)
    }
    loadProfile()
  }, [])

  const handleLogin = async () => {
    try {
      const authUrl = await poeApi.getAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      console.error("Error generating auth URL:", error)
    }
  }

  const handleLogout = () => {
  poeApi.logout()
  setIsAuthenticated(false)
  setAccountName(null)
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          Loading authentication status...
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🔐 Authentication</h3>
        <div className={`status ${isAuthenticated ? "status-connected" : "status-disconnected"}`}>
          {isAuthenticated ? (accountName ? accountName : "Connected") : "Not Connected"}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-muted">
          {isAuthenticated
            ? "Connected to Path of Exile API with full access"
            : "Connect to access your account data and enhanced features"}
        </p>
      </div>

      {isAuthenticated ? (
        <div>
          <div className="mb-4 text-sm">
            <div className="text-success">✓ Access to private stash tabs</div>
            <div className="text-success">✓ Character information</div>
            <div className="text-success">✓ Account details</div>
            <div className="text-success">✓ Enhanced rate limits</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-primary"
            disabled
            aria-disabled="true"
            title="Temporarily disabled"
          >
            🚪 Disconnect (disabled)
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-muted">
            Currently using public data only.
            <br />
            Connect for enhanced features.
          </div>
          <button
            onClick={handleLogin}
            className="btn btn-accent"
            disabled
            aria-disabled="true"
            title="Temporarily disabled"
          >
            🔗 Connect to Path of Exile (disabled)
          </button>
        </div>
      )}
    </div>
  )
}
