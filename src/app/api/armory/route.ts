import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

// Configure this route as dynamic
export const dynamic = 'force-dynamic';

// API endpoints
const BASE_URL = 'https://www.pathofexile.com';
const POE_API_BASE = 'https://api.pathofexile.com';

// Headers for API requests
const PUBLIC_HEADERS = {
  'User-Agent': 'Poetoybocs/1.0 (contact: poetoybocs@example.com)',
  'Accept': 'application/json',
};

const DEFAULT_HEADERS = {
  ...PUBLIC_HEADERS,
  'Content-Type': 'application/x-www-form-urlencoded',
};

// Define interfaces for character data
interface Character {
  name: string;
  class: string;
  level: number;
  league: string;
  experience: number;
  lastActive: string;
  classId?: number;
  ascendancyClass?: number;
  items?: any[];
}

interface Account {
  name: string;
  characters: Character[];
}

// Simple in-memory cache
const accountCache: Record<string, { data: any, timestamp: number }> = {};
const characterCache: Record<string, { data: any, timestamp: number }> = {};

const ACCOUNT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CHARACTER_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let lastRequestTime = 0;
const REQUEST_DELAY = 1000; // 1 second delay between requests

// Function to get data from cache
function getFromCache(cache: Record<string, { data: any, timestamp: number }>, key: string, allowStale = false): any {
  const entry = cache[key];
  if (!entry) return null;
  
  const now = Date.now();
  const isExpired = now - entry.timestamp > CHARACTER_CACHE_DURATION;
  
  if (!isExpired || allowStale) {
    return entry.data;
  }
  
  return null;
}

// Function to update cache
function updateCache(cache: Record<string, { data: any, timestamp: number }>, key: string, data: any, duration: number): void {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
  
  // Set timeout to clear cache after duration
  setTimeout(() => {
    delete cache[key];
  }, duration);
}

// Format account name for API requests
function formatAccountName(accountName: string): string {
  // Remove leading/trailing whitespace
  const trimmed = accountName.trim();
  
  // For Battle.net style account names (with #), we need to remove any spaces
  if (trimmed.includes('#')) {
    console.log('Formatting Battle.net style account name:', trimmed);
    // Remove any spaces
    return trimmed.replace(/\s+/g, '');
  }
  
  return trimmed;
}

// Helper functions
function formatClassName(className: string): string {
  // Convert camelCase or snake_case to Title Case with spaces
  return className
    .replace(/([A-Z])/g, ' $1') // Insert a space before all capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^\s+/, '') // Remove leading space if any
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatLastActive(timestamp: number | string): string {
  if (!timestamp) return 'Unknown';
  
  // If timestamp is a string that can be parsed as a number, convert it
  const numericTimestamp = typeof timestamp === 'string' 
    ? parseInt(timestamp, 10) 
    : timestamp;
  
  // Convert timestamp to date
  const date = new Date(numericTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Format date to a readable string
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Map frame type to rarity
function mapFrameTypeToRarity(frameType: number): string {
  switch (frameType) {
    case 0: return 'Normal';
    case 1: return 'Magic';
    case 2: return 'Rare';
    case 3: return 'Unique';
    case 4: return 'Gem';
    case 5: return 'Currency';
    case 6: return 'Divination Card';
    case 7: return 'Quest Item';
    case 8: return 'Prophecy';
    case 9: return 'Relic';
    default: return 'Unknown';
  }
}

// Check if we have an OAuth token and prepare headers
function getAuthHeaders() {
  const token = cookies().get('poe_auth_token')?.value;
  
  if (token) {
    return {
      ...DEFAULT_HEADERS,
      'Authorization': `Bearer ${token}`
    };
  }
  
  return DEFAULT_HEADERS;
}

// Function to fetch character items using the authenticated API if possible
async function fetchCharacterItems(accountName: string, characterName: string) {
  const token = cookies().get('poe_auth_token')?.value;
  
  if (token) {
    try {
      // Try to use the authenticated API
      console.log('Using authenticated API to fetch character items');
      const response = await axios.get(
        `${POE_API_BASE}/character/${encodeURIComponent(characterName)}/items`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      // Ensure we have classId and ascendancyClass in the response
      if (response.data && response.data.character) {
        response.data.character.classId = response.data.character.classId || 0;
        response.data.character.ascendancyClass = response.data.character.ascendancyClass || 0;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error using authenticated API, falling back to public API:', error);
      // Fall back to the public API if the authenticated one fails
    }
  }
  
  // Use the public API as fallback
  console.log('Using public API to fetch character items');
  
  // For the public API, we need to properly format the account name
  const formattedName = accountName.trim().replace(/\s+/g, '');
  console.log('Account and character for API request:', { formattedName, characterName });
  
  try {
    // Try direct URL approach first
    const directUrl = `${BASE_URL}/character-window/get-items?accountName=${encodeURIComponent(formattedName)}&character=${encodeURIComponent(characterName)}&realm=pc`;
    console.log('Trying direct URL for items:', directUrl);
    
    const response = await axios.get(directUrl, { 
      headers: DEFAULT_HEADERS,
      validateStatus: (status) => status < 500 // Accept any status code less than 500
    });
    
    console.log('Direct URL items response status:', response.status);
    
    if (response.status === 200) {
      console.log('Direct URL for items successful');
      
      // For the public API, we need to fetch additional character data to get classId and ascendancyClass
      try {
        // Try direct URL for passive skills
        const passiveUrl = `${BASE_URL}/character-window/get-passive-skills?accountName=${encodeURIComponent(formattedName)}&character=${encodeURIComponent(characterName)}&realm=pc`;
        console.log('Trying direct URL for passive skills:', passiveUrl);
        
        const charResponse = await axios.get(passiveUrl, {
          headers: DEFAULT_HEADERS,
          validateStatus: (status) => status < 500
        });
        
        console.log('Direct URL passive skills response status:', charResponse.status);
        
        if (response.data && response.data.character && charResponse.status === 200) {
          response.data.character.classId = charResponse.data.character?.classId || 0;
          response.data.character.ascendancyClass = charResponse.data.character?.ascendancyClass || 0;
        }
      } catch (error: any) {
        console.error('Error fetching additional character data:', error.message);
        // Continue even if we couldn't get the class data
      }
      
      return response.data;
    }
    
    // If direct URL fails, try POST method
    console.log('Direct URL for items failed, trying POST method');
    
    const itemFormData = {
      accountName: formattedName,
      character: characterName,
      realm: 'pc' // Default to PC realm
    };
    
    const postResponse = await axios.post(
      `${BASE_URL}/character-window/get-items`,
      new URLSearchParams(itemFormData).toString(),
      { headers: DEFAULT_HEADERS }
    );
    
    console.log('POST items response status:', postResponse.status);
    
    // For the public API, we need to fetch additional character data to get classId and ascendancyClass
    try {
      const charResponse = await axios.post(
        `${BASE_URL}/character-window/get-passive-skills`,
        new URLSearchParams({
          accountName: formattedName,
          character: characterName,
          realm: 'pc'
        }).toString(),
        { headers: DEFAULT_HEADERS }
      );
      
      console.log('POST passive skills response status:', charResponse.status);
      
      if (postResponse.data && postResponse.data.character && charResponse.data) {
        postResponse.data.character.classId = charResponse.data.character?.classId || 0;
        postResponse.data.character.ascendancyClass = charResponse.data.character?.ascendancyClass || 0;
      }
    } catch (error: any) {
      console.error('Error fetching additional character data:', error.message);
      // Continue even if we couldn't get the class data
    }
    
    return postResponse.data;
  } catch (error: any) {
    console.error('Error fetching character items from public API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Function to fetch characters using the authenticated API if possible
async function fetchCharacters(accountName: string) {
  console.log(`Fetching characters for account: ${accountName}`);
  
  try {
    // First try authenticated API if we have a token
    const token = cookies().get('poe_auth_token')?.value;
    
    if (token) {
      try {
        console.log('Using authenticated API for character fetch');
        const response = await axios.get(`${POE_API_BASE}/character`, {
          headers: {
            ...DEFAULT_HEADERS,
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`Found ${response.data.length} characters via authenticated API`);
          return response.data;
        } else {
          console.log('Unexpected response format from authenticated API:', response.data);
        }
      } catch (error) {
        console.error('Error using authenticated API:', error);
        // Fall through to public API
      }
    }
    
    // Fall back to public API
    console.log('Using public API for character fetch');
    const response = await axios.get(
      `${BASE_URL}/character-window/get-characters?accountName=${encodeURIComponent(accountName)}&realm=pc`,
      { headers: DEFAULT_HEADERS }
    );
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} characters via public API`);
      return response.data;
    } else {
      console.log('Unexpected response format from public API:', response.data);
      throw new Error('Invalid response format from Path of Exile API');
    }
  } catch (error: any) {
    console.error('Error fetching characters:', error);
    
    // Check if this is a "profile is private" error
    if (error.response?.data?.error?.message === 'Profile tab is private') {
      throw new Error('This account\'s profile is private. Please make it public in your Path of Exile account settings.');
    }
    
    // Rethrow the error
    throw error;
  }
}

// Function to fetch character data
async function fetchCharacterData(accountName: string, characterName: string, useStaleCache: boolean) {
  const characterCacheKey = `${accountName.toLowerCase()}_${characterName.toLowerCase()}`;
  const cachedCharacter = getFromCache(characterCache, characterCacheKey, useStaleCache);
  
  if (cachedCharacter) {
    console.log(`Using cached data for character: ${characterName}`);
    return cachedCharacter;
  }
  
  try {
    // Fetch items for the character
    const itemsData = await fetchCharacterItems(accountName, characterName);
    
    if (!itemsData) {
      throw new Error('Invalid items response format');
    }
    
    // Fetch character details
    const charactersData = await fetchCharacters(accountName);
    
    if (!charactersData || !Array.isArray(charactersData)) {
      throw new Error('Invalid characters response format');
    }
    
    const characterDetails = charactersData.find((char: any) => char.name === characterName);
    
    if (!characterDetails) {
      throw new Error(`Character ${characterName} not found`);
    }
    
    // Check if items array exists and is valid
    const items = itemsData.items || [];
    if (!Array.isArray(items)) {
      console.warn(`No items array found for character ${characterName}, using empty array`);
    }
    
    // Create the character data
    const characterData = {
      character: {
        name: characterDetails.name,
        class: formatClassName(characterDetails.class),
        level: characterDetails.level,
        league: characterDetails.league,
        experience: characterDetails.experience,
        lastActive: formatLastActive(characterDetails.lastActive),
        classId: itemsData.character?.classId,
        ascendancyClass: itemsData.character?.ascendancyClass,
      },
      items: Array.isArray(items) ? items : []
    };
    
    // Cache the character data
    updateCache(characterCache, characterCacheKey, characterData, CHARACTER_CACHE_DURATION);
    
    console.log('Returning character data with items:', 
      JSON.stringify({
        ...characterData,
        items: `[${Array.isArray(items) ? items.length : 0} items]` // Just log the count to avoid huge logs
      })
    );
    
    return characterData;
  } catch (error) {
    console.error(`Error fetching items for character ${characterName}:`, error);
    
    // Check if this is a rate limiting error
    const axiosError = error as any;
    if (axiosError.response && axiosError.response.status === 429) {
      const retryAfter = axiosError.response.headers['retry-after'] || 60;
      console.log(`Rate limited by Path of Exile API. Retry after ${retryAfter} seconds.`);
      
      // Try to use stale cache as fallback
      const staleCharacter = getFromCache(characterCache, characterCacheKey, true);
      if (staleCharacter) {
        console.log(`Using stale cache for character ${characterName} due to rate limiting`);
        return {
          ...staleCharacter,
          fromStaleCache: true,
          rateLimited: true,
          retryAfter
        };
      }
      
      return {
        error: `Rate limited by Path of Exile API. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter: retryAfter
      };
    }
    
    // If we failed to get items, try to at least return the character info
    try {
      const charactersData = await fetchCharacters(accountName);
      
      if (!charactersData || !Array.isArray(charactersData)) {
        throw new Error('Invalid characters response format');
      }
      
      const characterDetails = charactersData.find((char: any) => char.name === characterName);
      
      if (!characterDetails) {
        throw new Error(`Character ${characterName} not found`);
      }
      
      // Create character data with empty items
      const characterData = {
        character: {
          name: characterDetails.name,
          class: formatClassName(characterDetails.class),
          level: characterDetails.level,
          league: characterDetails.league,
          experience: characterDetails.experience,
          lastActive: formatLastActive(characterDetails.lastActive),
        },
        items: [] // Empty items array
      };
      
      // Cache this limited data
      updateCache(characterCache, characterCacheKey, characterData, CHARACTER_CACHE_DURATION);
      
      return characterData;
    } catch (charError) {
      console.error(`Error fetching character ${characterName}:`, charError);
      return {
        error: 'Failed to fetch character data'
      };
    }
  }
}

// Helper function to handle rate limiting
async function fetchWithRateLimitHandling(url: string) {
  // Ensure we don't make requests too quickly
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // If we hit a rate limit, respect the Retry-After header
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after: ${retryAfter} seconds`);
      
      // You could implement retry logic here if needed
      // For now, we'll just return the response and let the caller handle it
    }
    
    return response;
  } catch (error) {
    console.error('Error in fetchWithRateLimitHandling:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountName = searchParams.get('accountName');
  const characterName = searchParams.get('character');
  const useStaleCache = searchParams.get('useStaleCache') === 'true';
  
  if (!accountName) {
    return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
  }
  
  const formattedAccountName = formatAccountName(accountName);
  console.log('Formatted account name:', formattedAccountName);
  
  try {
    if (characterName) {
      // Fetch specific character data
      const characterData = await fetchCharacterData(formattedAccountName, characterName, useStaleCache);
      return NextResponse.json(characterData);
    } else {
      // Fetch all characters for the account
      console.log('Fetching characters for account:', formattedAccountName);
      const characters = await fetchCharacters(formattedAccountName);
      console.log('Found', characters.length, 'characters via public API');
      console.log('Returning account data with characters:', characters.length);
      
      // Return characters in the correct format
      const accountData = {
        account: {
          name: formattedAccountName,
          characters: characters.map((character: any) => ({
            name: character.name,
            class: formatClassName(character.class),
            level: character.level,
            league: character.league,
            experience: character.experience,
            lastActive: formatLastActive(character.lastActive),
          }))
        }
      };
      
      return NextResponse.json(accountData);
    }
  } catch (error) {
    console.error('Error in API route:', error);
    
    // Check for rate limiting
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 
        'status' in error.response && error.response.status === 429 &&
        'headers' in error.response && error.response.headers && 
        typeof error.response.headers === 'object') {
      const headers = error.response.headers as Record<string, string | number>;
      const retryAfter = headers['retry-after'] || 60;
      return NextResponse.json(
        { error: 'Rate limited by Path of Exile API', retryAfter },
        { status: 429 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred while fetching data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountName, characterName, useStaleCache = false } = body;
    
    if (!accountName || !characterName) {
      return NextResponse.json({ error: 'Account name and character name are required' }, { status: 400 });
    }
    
    console.log('POST request received for character data:', { accountName, characterName });
    
    // Format account name to handle Battle.net style names
    const formattedAccountName = formatAccountName(accountName);
    console.log('Formatted account name:', formattedAccountName);
    
    try {
      // Fetch character data with items
      const characterData = await fetchCharacterData(formattedAccountName, characterName, useStaleCache);
      return NextResponse.json(characterData);
    } catch (error: any) {
      console.error('Error fetching character data:', error);
      
      // Check for rate limiting
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        return NextResponse.json(
          { error: 'Rate limited by Path of Exile API', retryAfter },
          { status: 429 }
        );
      }
      
      // Handle other errors
      return NextResponse.json(
        { error: error.message || 'An error occurred while fetching character data' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
