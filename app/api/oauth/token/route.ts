export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, state, codeVerifier } = body

    const envRedirect = process.env.NEXT_PUBLIC_POE_REDIRECT_URI || ""
    const envClientId = process.env.NEXT_PUBLIC_POE_CLIENT_ID || ""
    const hasSecret = !!process.env.POE_CLIENT_SECRET

    if (!envClientId || !hasSecret || !envRedirect) {
      console.error("OAuth env missing", { envClientIdSet: !!envClientId, hasSecret, envRedirectSet: !!envRedirect })
      return Response.json(
        { error: "server_misconfig", error_description: "OAuth environment variables not set server-side" },
        { status: 500 },
      )
    }
    console.log("Token exchange request:", {
      code: code?.substring(0, 10) + "...",
      state,
      codeVerifier: codeVerifier?.substring(0, 10) + "...",
      redirect_uri: envRedirect,
    })

    const tokenResponse = await fetch("https://www.pathofexile.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: envClientId,
        client_secret: process.env.POE_CLIENT_SECRET || "",
        code: code,
  redirect_uri: envRedirect,
        code_verifier: codeVerifier,
        scope: "account:profile",
      }),
    })

    if (!tokenResponse.ok) {
      let providerError: any = null
      try {
        providerError = await tokenResponse.json()
      } catch {
        const fallback = await tokenResponse.text()
        providerError = { raw: fallback }
      }
      console.error("Token exchange failed", {
        status: tokenResponse.status,
        providerError,
      })
      return Response.json(
        {
          error: providerError?.error || "token_exchange_failed",
          error_description: providerError?.error_description || providerError?.raw || "Unknown error",
          status: tokenResponse.status,
        },
        { status: tokenResponse.status },
      )
    }

    const tokenData = await tokenResponse.json()
    return Response.json(tokenData)
  } catch (error) {
    console.error("OAuth token exchange error:", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
