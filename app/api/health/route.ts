export async function GET() {
  // Simple health check endpoint
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    vercel: process.env.VERCEL_ENV || "not-vercel"
  })
}
