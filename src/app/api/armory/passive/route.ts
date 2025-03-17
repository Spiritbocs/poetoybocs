import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';

const BASE_URL = 'https://www.pathofexile.com';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded',
};

// Format account name for Battle.net style accounts
function formatAccountName(accountName: string): string {
  // If the account name contains a hash (#), it's a Battle.net style account
  if (accountName.includes('#')) {
    return accountName;
  }
  return accountName.trim().replace(/\s+/g, '');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountName = searchParams.get('accountName');
  const characterName = searchParams.get('character');
  const realm = searchParams.get('realm') || 'pc';

  console.log('Passive API Request received:', {
    accountName,
    characterName,
    realm
  });

  if (!accountName || !characterName) {
    return NextResponse.json({ error: 'Account name and character name are required' }, { status: 400 });
  }

  try {
    // Format account name for Battle.net style accounts
    const formattedAccountName = formatAccountName(accountName);
    console.log('Formatted account name for passive skills:', formattedAccountName);

    // Fetch passive skills data
    const response = await axios.post(
      `${BASE_URL}/character-window/get-passive-skills`,
      new URLSearchParams({
        accountName: formattedAccountName,
        character: characterName,
        realm: realm
      }).toString(),
      { headers }
    );

    console.log('Passive skills data fetched successfully');
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching passive skills:', error);
    
    const axiosError = error as any;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const responseData = axiosError.response.data;
      
      console.log('Passive API Error Response:', {
        status,
        data: responseData
      });
      
      if (status === 404) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
      } else if (status === 403) {
        return NextResponse.json({
          error: 'Access denied by Path of Exile API',
          details: 'The Path of Exile API is protected by Cloudflare, which may block automated requests.'
        }, { status: 403 });
      } else if (status === 429) {
        const retryAfter = axiosError.response?.headers?.['retry-after'] || 60;
        return NextResponse.json({ 
          error: `Rate limited by Path of Exile API. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
          retryAfter: retryAfter
        }, { status: 429 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch passive skills data',
      message: axiosError.message || 'Unknown error'
    }, { status: 500 });
  }
}
