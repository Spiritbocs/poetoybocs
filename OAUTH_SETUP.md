# PoE OAuth Setup Guide

## ⚠️ CRITICAL: Authentication Setup Required

Your PoE Toy Bocs desktop app needs OAuth authentication to access character data.

### Step 1: Create PoE OAuth Application

1. Go to: https://www.pathofexile.com/developer/api-key-request
2. Fill out the form:
   - **Application Name**: `PoE Toy Bocs Desktop`
   - **Application Description**: `Desktop tool for PoE character and trade data`
   - **Redirect URI**: `http://localhost:3000/oauth/callback`
   - **Scopes**: Check `account:characters` (required for character data)

3. Submit and wait for approval (usually instant)

### Step 2: Configure Environment Variables

1. Open your `.env.local` file in the project root
2. Uncomment and fill in these lines:

```bash
NEXT_PUBLIC_POE_CLIENT_ID=your_client_id_from_step_1
NEXT_PUBLIC_POE_REDIRECT_URI=http://localhost:3000/oauth/callback
```

### Step 3: Restart the Application

1. Stop your current dev server (Ctrl+C in terminal)
2. Run `npm run dev:next` again
3. Start Electron with `npm run dev:electron`

### Step 4: Test Authentication

1. The "Authentication" section should now show "Connect" button instead of "Environment not configured"
2. Click "Connect" to start OAuth flow
3. Login with your PoE account
4. Should see character data loaded

## Troubleshooting

### Error: "Environment not configured"
- Check that both `NEXT_PUBLIC_POE_CLIENT_ID` and `NEXT_PUBLIC_POE_REDIRECT_URI` are set in `.env.local`
- Restart the dev server after making changes

### Error: "No characters found"
- Make sure you have characters in your PoE account
- Check that you approved the OAuth application correctly
- Try refreshing the character data

### UI Text Not Visible
- This is being fixed in the next update
- Dark theme colors will be properly applied

## Current Status

❌ **Authentication**: Not configured (OAuth environment variables missing)  
❌ **Character Data**: Cannot load without authentication  
✅ **Trade Session**: Configured and working  
🔄 **UI Theme**: Being fixed for better visibility  

**Next Steps**: Complete OAuth setup above, then character features will work!
