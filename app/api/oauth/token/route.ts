export async function POST(request: Request) {
  try {
    // --- Read & parse incoming body once ---
    let rawBody = ""
    try {
      rawBody = await request.text()
      console.log("[OAuth Token] Incoming request body:", rawBody);
    } catch (e: any) {
      console.error("[OAuth Token] Failed reading request body", e);
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
        const parsed = JSON.parse(rawBody);
        code = parsed.code;
        state = parsed.state;
        codeVerifier = parsed.codeVerifier;
        console.log("[OAuth Token] Parsed values:", { code, state, codeVerifier });
      }
    } catch (e) {
      console.error("[OAuth Token] Malformed JSON body", { rawSnippet: rawBody.slice(0, 120) });
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
  // Use client secret if provided (confidential client). PoE issues client secrets; PKCE still valid as added protection.
  const clientSecret = process.env.POE_CLIENT_SECRET || ""
  const hasSecret = !!clientSecret

    if (!envClientId || !envRedirect) {
      console.error("OAuth env missing", { envClientIdSet: !!envClientId, envRedirectSet: !!envRedirect })
      return Response.json(
        { error: "server_misconfig", error_description: "OAuth environment variables not set server-side" },
        { status: 500 },
      )
    }

    console.log("Token exchange start", {
      codePrefix: code.substring(0, 8),
      statePrefix: state?.substring(0, 8),
      verifierPrefix: codeVerifier.substring(0, 8),
      redirect_uri: envRedirect,
      hasSecret,
    })

    const attempts: Array<{ withSecret: boolean; attempt: number }> = hasSecret
      ? [
          { withSecret: true, attempt: 1 },
          { withSecret: false, attempt: 2 }, // fallback without secret if blocked
        ]
      : [{ withSecret: false, attempt: 1 }]

    const buildForm = (includeSecret: boolean) => {
      const f = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: envClientId,
        code,
        redirect_uri: envRedirect,
        code_verifier: codeVerifier,
        scope: "account:profile",
      });
      if (includeSecret && hasSecret) f.set("client_secret", clientSecret);
      console.log("[OAuth Token] Form data for exchange:", f.toString());
      return f
    }

    const blockedDetector = (raw: string) =>
      /<title>Attention Required! \| Cloudflare<\/title>/i.test(raw) || /cf-error-details/.test(raw) || /You are unable to access\s+pathofexile\.com/i.test(raw)

    for (const a of attempts) {
      const form = buildForm(a.withSecret)
      console.log("[OAuth Token] Attempting token exchange:", {
        attempt: a.attempt,
        withSecret: a.withSecret,
        code_present: !!form.get("code"),
        verifier_len: form.get("code_verifier")?.length,
      })
      let upstream: Response
      try {
        upstream = await fetch("https://www.pathofexile.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: envRedirect,
            Origin: new URL(envRedirect).origin,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) poetoybocs OAuth/1.0 Chrome/125 Safari/537.36",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: form,
        })
      } catch (e: any) {
        console.error("[OAuth Token] Network error during attempt", { attempt: a.attempt, withSecret: a.withSecret, error: e?.message })
        if (a.attempt === attempts.length) {
          return Response.json(
            { error: "network_error", error_description: e?.message || "Failed to contact token endpoint" },
            { status: 502 },
          )
        }
        continue
      }

      let upstreamRaw = ""
      try {
        upstreamRaw = await upstream.text()
      } catch (e: any) {
        console.error("[OAuth Token] Failed reading upstream body", { attempt: a.attempt, error: e?.message })
        if (a.attempt === attempts.length)
          return Response.json(
            { error: "upstream_body_error", error_description: e?.message || "Could not read upstream body" },
            { status: 502 },
          )
        continue
      }

      console.log("[OAuth Token] Upstream response:", { status: upstream.status, bodyLength: upstreamRaw.length, bodyPreview: upstreamRaw.substring(0, 100) })

      const cfBlocked = blockedDetector(upstreamRaw)
      if (cfBlocked) {
        const rayMatch = upstreamRaw.match(/Ray ID:\s*<strong[^>]*>([A-Za-z0-9]+)<\/strong>/i)
        const ray = rayMatch?.[1]
        console.warn("[OAuth Token] Cloudflare block detected", { attempt: a.attempt, withSecret: a.withSecret, ray })
        if (a.attempt === attempts.length) {
          return Response.json(
            {
              error: "cloudflare_blocked",
              error_description: "Cloudflare blocked the OAuth token request after retries.",
              ray,
              status: upstream.status || 403,
            },
            { status: 403 },
          )
        }
        // try next attempt (e.g., without secret)
        continue
      }

      let upstreamJson: any = null
      if (upstreamRaw) {
        try { upstreamJson = JSON.parse(upstreamRaw) } catch { /* ignore non-json */ }
      }

      if (!upstream.ok) {
        console.error("[OAuth Token] Token exchange failed", {
          attempt: a.attempt,
            status: upstream.status,
          withSecret: a.withSecret,
          bodyPreview: upstreamRaw.slice(0, 240),
        })
        return Response.json(
          {
            error: upstreamJson?.error || "token_exchange_failed",
            error_description: upstreamJson?.error_description || upstreamRaw || "Unknown error",
            status: upstream.status,
            attempt: a.attempt,
          },
          { status: upstream.status },
        )
      }

      if (!upstreamJson) {
        console.warn("[OAuth Token] Success status but non-JSON", { attempt: a.attempt, preview: upstreamRaw.slice(0, 100) })
        return Response.json(
          { error: "invalid_upstream_format", error_description: "Expected JSON token payload" },
          { status: 502 },
        )
      }

      console.log("[OAuth Token] Token exchange success", { attempt: a.attempt })
      return Response.json(upstreamJson)
    }
    // Should not reach here
    return Response.json(
      { error: "unreachable_state", error_description: "Token exchange attempts exhausted" },
      { status: 500 },
    )
  } catch (error) {
    console.error("OAuth token exchange handler crash", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
