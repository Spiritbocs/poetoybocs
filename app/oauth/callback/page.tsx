"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { poeApi } from "@/lib/poe-api"

export default function OAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const error = searchParams.get("error")

      if (error) {
        setStatus("error")
        setError(`OAuth error: ${error}`)
        return
      }

      if (!code) {
        setStatus("error")
        setError("No authorization code received")
        return
      }

      if (!state) {
        setStatus("error")
        setError("No state parameter received")
        return
      }

      try {
        await poeApi.exchangeCodeForToken(code, state)
        setStatus("success")

        // Redirect to main app after 2 seconds
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Authentication failed")
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div className="card" style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
        <div className="card-header">
          <h2 className="card-title">Path of Exile Authentication</h2>
          <p className="text-muted">Processing your authentication...</p>
        </div>

        {status === "loading" && (
          <div>
            <div className="spinner" style={{ margin: "20px auto" }}></div>
            <p>Authenticating with Path of Exile...</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div style={{ fontSize: "48px", color: "var(--poe-green)", margin: "20px 0" }}>✅</div>
            <p>Authentication successful!</p>
            <p className="text-muted text-sm">Redirecting to the app...</p>
          </div>
        )}

        {status === "error" && (
          <div>
            <div style={{ fontSize: "48px", color: "var(--poe-red)", margin: "20px 0" }}>❌</div>
            <p>Authentication failed</p>
            <p className="text-danger text-sm mb-4">{error}</p>
            <button onClick={() => router.push("/")} className="btn btn-primary">
              Return to App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
