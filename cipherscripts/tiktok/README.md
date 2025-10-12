# TikTok OAuth Token Management

This directory contains scripts for managing TikTok API OAuth tokens.

## 📋 Overview

TikTok access tokens expire after 24 hours and must be refreshed. These scripts handle the complete OAuth flow and automatic token refresh.

## 🚀 Initial Setup (One-Time)

### Step 1: Generate Authorization URL

```bash
cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be/cipherscripts/tiktok
node 1-generateAuthUrl.js
```

This will output an authorization URL. Open it in your browser, log in to TikTok, and authorize your app.

### Step 2: Exchange Code for Token

After authorizing, you'll be redirected to your redirect URI with a `code` parameter. Copy that code and run:

```bash
node 2-exchangeCodeForToken.js <YOUR_AUTHORIZATION_CODE>
```

This will:
- Exchange the code for access and refresh tokens
- Automatically update `secrets.js` with the tokens
- Save the tokens for future use

## 🔄 Automatic Token Refresh

### Option A: Cron Job (Recommended)

Set up a cron job to automatically refresh the token every 12 hours:

```bash
# Edit your crontab
crontab -e

# Add this line (runs every 12 hours at 2am and 2pm)
0 2,14 * * * cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be/cipherscripts/tiktok && /usr/local/bin/node 3-refreshAccessToken.js >> ../../logs/tiktok-cron.log 2>&1
```

**To find your node path:**
```bash
which node
```

### Option B: PM2 Process Manager (Alternative)

If you're using PM2 to run your Node.js app, you can use PM2's cron feature:

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the refresh script with cron
pm2 start 3-refreshAccessToken.js --name tiktok-token-refresh --cron "0 */12 * * *"
```

### Option C: Manual Refresh

You can also run the refresh script manually whenever needed:

```bash
node 3-refreshAccessToken.js
```

## 📊 Monitoring

### Check Cron Logs

```bash
tail -f /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be/logs/tiktok-cron.log
```

### Check Refresh Logs

```bash
tail -f /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be/logs/tiktok-token-refresh.log
```

### Verify Current Token

Check your `secrets.js` file to see if tokens are populated:

```bash
grep "TIKTOK_ACCESS_TOKEN" /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be/secrets.js
```

## ⚙️ Configuration

### Update Redirect URI

Before running Step 1, update the `REDIRECT_URI` in:
- `1-generateAuthUrl.js`
- `2-exchangeCodeForToken.js`

Default is `http://localhost:3000/auth/tiktok/callback` - change this to your production URL if needed.

### Update Scopes

The default scopes are:
- `video.upload` - Upload videos
- `video.publish` - Publish videos
- `user.info.basic` - Get basic user info

If you need different scopes, update the `SCOPES` array in `1-generateAuthUrl.js`.

## 🔍 Troubleshooting

### "TIKTOK_REFRESH_TOKEN is not set"
Run Step 2 first to get initial tokens.

### "Invalid refresh token"
Your refresh token may have expired (365 days). Re-run Steps 1 and 2.

### "Redirect URI mismatch"
Make sure the redirect URI in the scripts matches exactly what you configured in the TikTok Developer Portal.

### Cron not running
Check cron status:
```bash
# View your crontab
crontab -l

# Check system logs
tail -f /var/log/system.log | grep cron
```

## 📝 Token Lifecycle

1. **Access Token**: Valid for 24 hours
2. **Refresh Token**: Valid for 365 days
3. **Recommended**: Refresh every 12 hours (twice daily)
4. **Maximum**: Must refresh before 24 hours

## 🎯 Best Practices

1. **Run refresh twice daily** (every 12 hours) to ensure you never miss a refresh
2. **Monitor logs** regularly to catch any issues early
3. **Set up alerts** if the refresh fails (optional but recommended)
4. **Keep credentials secure** - never commit secrets.js to git

## 📚 Resources

- [TikTok OAuth Documentation](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-overview/)

