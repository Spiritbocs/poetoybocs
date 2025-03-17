import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

// Configure this route as dynamic
export const dynamic = 'force-dynamic';

// OAuth2 configuration
const POE_OAUTH_CONFIG = {
  clientId: 'poetoybocs',
  clientSecret: 'AOLaZbrijm3f', // In a production app, this should be stored in environment variables
  redirectUri: 'https://poetoybocs.netlify.app/oauth/callback',
  authorizationEndpoint: 'https://www.pathofexile.com/oauth/authorize',
  tokenEndpoint: 'https://www.pathofexile.com/oauth/token',
  scope: 'account:characters account:profile',
};

// Generate a random state for OAuth2 security
function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Get the authorization URL for the Path of Exile OAuth2 flow
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'login') {
    // Generate and store state for CSRF protection
    const state = generateState();
    
    // Store state in a cookie for verification when the user returns
    cookies().set('poe_oauth_state', state, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Construct the authorization URL
    const authUrl = new URL(POE_OAUTH_CONFIG.authorizationEndpoint);
    authUrl.searchParams.append('client_id', POE_OAUTH_CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', POE_OAUTH_CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', POE_OAUTH_CONFIG.scope);
    authUrl.searchParams.append('state', state);

    // Return the authorization URL for the client to redirect to
    return NextResponse.json({ authUrl: authUrl.toString() });
  } 
  else if (action === 'logout') {
    // Clear the auth token cookie
    cookies().delete('poe_auth_token');
    return NextResponse.json({ success: true });
  }
  
  // Check if user is authenticated
  const token = cookies().get('poe_auth_token')?.value;
  return NextResponse.json({ 
    authenticated: !!token,
    // Don't include the actual token in the response for security
  });
}

// Handle the OAuth2 callback from Path of Exile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    // Verify the state to prevent CSRF attacks
    const storedState = cookies().get('poe_oauth_state')?.value;
    
    if (!storedState || state !== storedState) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Clear the state cookie as it's no longer needed
    cookies().delete('poe_oauth_state');

    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      POE_OAUTH_CONFIG.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: POE_OAUTH_CONFIG.redirectUri,
        client_id: POE_OAUTH_CONFIG.clientId,
        client_secret: POE_OAUTH_CONFIG.clientSecret,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, token_type, expires_in, refresh_token } = tokenResponse.data;

    // Store the token in a secure, HTTP-only cookie
    cookies().set('poe_auth_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in,
      path: '/',
    });

    // Also store the refresh token if provided
    if (refresh_token) {
      cookies().set('poe_refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('OAuth token exchange error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to exchange authorization code for token',
      message: error.message || 'Unknown error',
    }, { status: 500 });
  }
}
