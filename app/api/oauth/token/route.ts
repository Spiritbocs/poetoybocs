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
      const form = buildForm(a.withSecret);
      console.log("[OAuth Token] Attempting token exchange:", {
        attempt: a.attempt,
        withSecret: a.withSecret,
      });
      let upstream: Response;
      try {
        upstream = await fetch("https://www.pathofexile.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json, text/plain, */*",
          },
          body: form,
        });
        const responseText = await upstream.text();
        console.log("[OAuth Token] Upstream response:", responseText);
        if (!upstream.ok) {
          console.error("[OAuth Token] Upstream error:", upstream.status, responseText);
          continue;
        }
        return new Response(responseText, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (err: any) {
        console.error("[OAuth Token] Fetch error:", err);
        continue;
      }
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
