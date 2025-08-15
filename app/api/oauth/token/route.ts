export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, state, codeVerifier } = body

    console.log("Token exchange request:", {
      code: code?.substring(0, 10) + "...",
      state,
      codeVerifier: codeVerifier?.substring(0, 10) + "...",
      redirect_uri: "https://poetoybocs.vercel.app/oauth/callback",
    })

    const tokenResponse = await fetch("https://www.pathofexile.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NEXT_PUBLIC_POE_CLIENT_ID || "",
        client_secret: process.env.POE_CLIENT_SECRET || "",
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_POE_REDIRECT_URI || "",
        code_verifier: codeVerifier,
        scope: "account:profile",
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        headers: Object.fromEntries(tokenResponse.headers.entries()),
        body: errorText,
      })
      return Response.json(
        {
          error: "Token exchange failed",
          status: tokenResponse.status,
          details: errorText,
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
