export async function POST(request: Request) {
  try {
    // --- Read & parse incoming body once ---
    let rawBody = ""
    try {
      rawBody = await request.text()
    } catch (e: any) {
      console.error("Failed reading request body", e)
      return Response.json(
        { error: "invalid_request", error_description: e?.message || "Unable to read request body" },
        { status: 400 },
      )
    }

    let code: string | undefined
    let state: string | undefined
    let codeVerifier: string | undefined
    try {
      if (rawBody) {
        const parsed = JSON.parse(rawBody)
        code = parsed.code
        state = parsed.state
        codeVerifier = parsed.codeVerifier
      }
    } catch (e) {
      console.error("Malformed JSON body", { rawSnippet: rawBody.slice(0, 120) })
      return Response.json(
        { error: "invalid_request", error_description: "Malformed JSON body" },
        { status: 400 },
      )
    }

    // --- Basic validation ---
    if (!code || !codeVerifier) {
      return Response.json(
        { error: "invalid_request", error_description: "Missing authorization code or codeVerifier" },
        { status: 400 },
      )
    }

    const envRedirect = process.env.NEXT_PUBLIC_POE_REDIRECT_URI || ""
    const envClientId = process.env.NEXT_PUBLIC_POE_CLIENT_ID || ""
  // For PoE OAuth with PKCE treat app as public; ignore client secret during investigation to rule out secret issues
  const clientSecret = process.env.POE_CLIENT_SECRET || ""
  const hasSecret = false // force omit while debugging 403 (set true later if needed)

    if (!envClientId || !envRedirect) {
      console.error("OAuth env missing", { envClientIdSet: !!envClientId, envRedirectSet: !!envRedirect })
      return Response.json(
        { error: "server_misconfig", error_description: "OAuth environment variables not set server-side" },
        { status: 500 },
      )
    }

    console.log("Token exchange request", {
      codePrefix: code.substring(0, 8),
      statePrefix: state?.substring(0, 8),
      verifierPrefix: codeVerifier.substring(0, 8),
      redirect_uri: envRedirect,
      withSecret: hasSecret,
    })

    // --- Build form body (omit client_secret if not set) ---
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: envClientId,
      code,
      redirect_uri: envRedirect,
      code_verifier: codeVerifier,
      scope: "account:profile",
    })
    // Intentionally not adding client_secret due to PKCE public client flow

    console.log("Outgoing token form (sanitized)", {
      grant_type: form.get('grant_type'),
      client_id: form.get('client_id'),
      redirect_uri: form.get('redirect_uri'),
      code_present: !!form.get('code'),
      code_verifier_len: form.get('code_verifier')?.length,
      scope: form.get('scope'),
      included_client_secret: form.has('client_secret')
    })

    let upstream: Response
    try {
      upstream = await fetch("https://www.pathofexile.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form,
      })
    } catch (e: any) {
      console.error("Network/Fetch error contacting PoE token endpoint", e)
      return Response.json(
        { error: "network_error", error_description: e?.message || "Failed to contact token endpoint" },
        { status: 502 },
      )
    }

    let upstreamRaw = ""
    try {
      upstreamRaw = await upstream.text()
    } catch (e: any) {
      console.error("Failed reading upstream response body", e)
      return Response.json(
        { error: "upstream_body_error", error_description: e?.message || "Could not read upstream body" },
        { status: 502 },
      )
    }

    let upstreamJson: any = null
    if (upstreamRaw) {
      try { upstreamJson = JSON.parse(upstreamRaw) } catch { /* non-json */ }
    }

    if (!upstream.ok) {
      console.error("Token exchange failed", {
        status: upstream.status,
        headers: Object.fromEntries(upstream.headers.entries()),
        bodyPreview: upstreamRaw.slice(0, 300),
      })
      return Response.json(
        {
          error: upstreamJson?.error || "token_exchange_failed",
          error_description: upstreamJson?.error_description || upstreamRaw || "Unknown error",
          status: upstream.status,
        },
        { status: upstream.status },
      )
    }

    if (!upstreamJson) {
      console.warn("Upstream success but non-JSON body", { preview: upstreamRaw.slice(0, 120) })
      return Response.json(
        { error: "invalid_upstream_format", error_description: "Expected JSON token payload" },
        { status: 502 },
      )
    }

    // Success
    return Response.json(upstreamJson)
  } catch (error) {
    console.error("OAuth token exchange handler crash", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
