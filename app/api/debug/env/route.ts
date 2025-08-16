export async function GET() {
  // Debug endpoint to check environment variables in production
  const envCheck = {
    CLIENT_ID_SET: !!(process.env.NEXT_PUBLIC_POE_CLIENT_ID),
    CLIENT_ID_LENGTH: process.env.NEXT_PUBLIC_POE_CLIENT_ID?.length || 0,
    REDIRECT_URI_SET: !!(process.env.NEXT_PUBLIC_POE_REDIRECT_URI),
    REDIRECT_URI: process.env.NEXT_PUBLIC_POE_REDIRECT_URI || 'NOT_SET',
    CLIENT_SECRET_SET: !!(process.env.POE_CLIENT_SECRET),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  }

  console.log("[Debug] Environment check:", envCheck)

  return Response.json(envCheck)
}
