# OAuth Setup Guide for Lumidex

This guide explains how to properly configure Google and Discord OAuth authentication for the Lumidex application.

## Overview

The authentication error "Unsupported provider: provider is not enabled" occurs when OAuth providers are not properly configured. This guide will help you set up:

- Google OAuth 2.0
- Discord OAuth 2.0

## Prerequisites

- Supabase project (already configured)
- Google Cloud Console access
- Discord Developer Portal access

## Google OAuth Setup

### 1. Create Google Cloud Project & OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. Configure OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" for user type
   - Fill in required fields:
     - App name: "Lumidex"
     - User support email: your email
     - Developer contact information: your email
   - Add authorized domains: `localhost`, `your-production-domain.com`
5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Lumidex Web Client"
   - Authorized redirect URIs:
     - `http://localhost:54321/auth/v1/callback` (local Supabase)
     - `https://your-supabase-project.supabase.co/auth/v1/callback` (production)

### 2. Configure Environment Variables

Add to your `.env.local`:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Discord OAuth Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name: "Lumidex"
4. Go to "OAuth2" tab
5. Add redirect URIs:
   - `http://localhost:54321/auth/v1/callback` (local Supabase)
   - `https://your-supabase-project.supabase.co/auth/v1/callback` (production)
6. Copy Client ID and Client Secret

### 2. Configure Environment Variables

Add to your `.env.local`:
```env
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
```

## Supabase Configuration

The OAuth providers are already configured in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
skip_nonce_check = true

[auth.external.discord]
enabled = true
client_id = "env(DISCORD_CLIENT_ID)"
secret = "env(DISCORD_CLIENT_SECRET)"
```

## Testing the Setup

1. Restart your Supabase local development server:
   ```bash
   supabase stop
   supabase start
   ```

2. Start your Next.js development server:
   ```bash
   npm run dev
   ```

3. Navigate to `/auth/signin` and test the OAuth buttons

## Troubleshooting

### Common Issues

1. **"Unsupported provider" error**: 
   - Ensure environment variables are set correctly
   - Restart Supabase and Next.js servers
   - Check that OAuth providers are enabled in `supabase/config.toml`

2. **Redirect URI mismatch**:
   - Verify redirect URIs in Google/Discord match Supabase callback URL
   - Format: `https://your-project.supabase.co/auth/v1/callback`

3. **Invalid client credentials**:
   - Double-check Client ID and Secret in environment variables
   - Ensure no extra spaces or quotes in `.env.local`

4. **Google API not enabled**:
   - Enable Google+ API in Google Cloud Console
   - Wait a few minutes for changes to propagate

### Debug Steps

1. Check Supabase logs:
   ```bash
   supabase logs
   ```

2. Verify environment variables are loaded:
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $DISCORD_CLIENT_ID
   ```

3. Test OAuth callback URLs manually:
   - Visit: `https://your-project.supabase.co/auth/v1/authorize?provider=google`

## Production Deployment

When deploying to production:

1. Update OAuth redirect URIs to use your production domain
2. Set environment variables in your hosting platform
3. Update `site_url` in Supabase dashboard Auth settings
4. Test OAuth flows in production environment

## Security Considerations

- Never commit OAuth secrets to version control
- Use different OAuth applications for development and production
- Regularly rotate OAuth secrets
- Monitor OAuth usage in provider dashboards
- Implement proper error handling for OAuth failures

## Next Steps

After completing OAuth setup:

1. Test both Google and Discord sign-in flows
2. Verify user profiles are created correctly
3. Test OAuth sign-in from different browsers/devices
4. Implement OAuth error handling in the UI
5. Add OAuth provider management in user settings

## Support

If you encounter issues:

1. Check Supabase Auth documentation
2. Review Google/Discord OAuth documentation
3. Check community forums for similar issues
4. Verify all URLs and credentials are correct