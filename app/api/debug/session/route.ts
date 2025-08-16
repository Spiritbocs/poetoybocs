export async function GET() {
  return Response.json({
    hasSessionId: !!(process.env.POE_TRADE_SESSION_ID),
    sessionIdLength: process.env.POE_TRADE_SESSION_ID?.length || 0,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  })
}
