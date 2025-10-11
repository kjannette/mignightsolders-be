# Midnight Soldiers Backend

Backend API for posting content to Facebook and Instagram.

## Quick Start

### First Time Setup

1. **Create Instagram Account**
   - See: [QUICK_START_NEW_INSTAGRAM.md](./QUICK_START_NEW_INSTAGRAM.md)
   - Create new Instagram: **@midnightsoldiers**
   - Convert to Business account
   - Connect to Facebook Page

2. **Configure API Credentials**
   ```bash
   # Generate long-lived access token
   node generateLongLivedToken.js
   
   # Update secrets.js with new Instagram account
   node updateInstagramConfig.js
   
   # Verify configuration
   node checkTokenPermissions.js
   ```

3. **Start Server**
   ```bash
   npm install
   node app.js
   ```

### Already Set Up?

```bash
npm install
node app.js
```

---

## Documentation

| File | Description |
|------|-------------|
| [QUICK_START_NEW_INSTAGRAM.md](./QUICK_START_NEW_INSTAGRAM.md) | TL;DR guide for Instagram setup |
| [CREATE_NEW_INSTAGRAM_ACCOUNT.md](./CREATE_NEW_INSTAGRAM_ACCOUNT.md) | Complete step-by-step Instagram setup |
| [FIX_INSTAGRAM_CONNECTION.md](./FIX_INSTAGRAM_CONNECTION.md) | Troubleshooting connection issues |
| [INSTAGRAM_PERMISSIONS_FIX.md](./INSTAGRAM_PERMISSIONS_FIX.md) | Fix permission errors |

---

## Utility Scripts

### `generateLongLivedToken.js`
Generate a 60-day access token from a short-lived token.

```bash
# 1. Get short-lived token from Graph API Explorer
# 2. Update SHORT_LIVED_TOKEN in the file
# 3. Run:
node generateLongLivedToken.js
```

### `updateInstagramConfig.js`
Update secrets.js with new Instagram Business Account ID.

```bash
node updateInstagramConfig.js
# Enter your Page Access Token when prompted
```

### `checkTokenPermissions.js`
Verify your access token has correct permissions and Instagram is connected.

```bash
node checkTokenPermissions.js
```

**Expected output when working:**
```
Token has the critical Instagram permissions
Instagram Business Account found!
Matches secrets.js configuration
```

---

## Project Structure

```
midnightsoldiers-be/
├── app.js                          # Main Express server
├── secrets.js                      # API credentials (NOT in git)
├── secrets.template.js             # Template for secrets.js
├── postController/
│   └── postController.js           # Handles post requests
├── postServices/
│   ├── facebookApiService.js       # Facebook API integration
│   └── instagramApiService.js      # Instagram API integration
├── Documents/
│   ├── Uploads/                    # Uploaded media files
│   └── Complaints/                 # Error logs
├── generateLongLivedToken.js       # Token generation utility
├── updateInstagramConfig.js        # Config update helper
└── checkTokenPermissions.js        # Diagnostic tool
```

---

## Configuration

### Required Environment

Create `secrets.js` based on `secrets.template.js`:

```javascript
const FACEBOOK_APP_ID = "your-app-id";
const FACEBOOK_APP_SECRET = "your-app-secret";
const FACEBOOK_PAGE_ID = "your-page-id";
const FACEBOOK_PAGE_ACCESS_TOKEN = "your-page-token";
const INSTAGRAM_BUSINESS_ACCOUNT_ID = "your-ig-business-id";
const INSTAGRAM_ACCESS_TOKEN = "your-instagram-token";
```

### Required Facebook/Instagram Permissions

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `instagram_manage_insights`
- `instagram_content_publish` (Critical for posting reels)

---

## Troubleshooting

### "Application does not have permission for this action"

**Cause:** Instagram Business Account not connected to Facebook Page

**Fix:** Follow [QUICK_START_NEW_INSTAGRAM.md](./QUICK_START_NEW_INSTAGRAM.md)

### "Invalid OAuth Access Token"

**Cause:** Token expired (tokens last 60 days)

**Fix:** 
```bash
node generateLongLivedToken.js
# Update secrets.js with new token
```

### "Instagram Business Account not found"

**Cause:** Instagram not properly connected to Facebook Page

**Fix:**
1. Go to Facebook Page → Settings → Instagram
2. Connect your Instagram Business Account
3. Run: `node checkTokenPermissions.js` to verify
4. Update secrets.js if Business Account ID changed

### Check if everything is configured correctly

```bash
node checkTokenPermissions.js
```

This will tell you:
- Token is valid
- Has correct permissions
- Instagram account is connected
- Business Account ID matches configuration

---

## API Endpoints

### POST `/reels/post`

Post a reel to Facebook and/or Instagram.

**Request Body:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "description": "Caption text with #hashtags",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "title": "Video Title",
  "platforms": {
    "facebook": true,
    "instagram": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "facebook": {
      "success": true,
      "data": { ... }
    },
    "instagram": {
      "success": true,
      "data": { ... }
    }
  }
}
```

---

## Token Maintenance

Access tokens expire every **60 days**. Set a reminder to regenerate:

```bash
# Every 60 days:
node generateLongLivedToken.js
# Update secrets.js with new token
# Restart server
```

---

## Current Configuration

- **Facebook App:** midnightsol (ID: 1453446205748046)
- **Facebook Page:** midnightsol (ID: 862511466941111)
- **Instagram:** @midnightsoldiers (or your chosen username)
- **API Version:** v23.0

---

## Support & Resources

### Facebook/Instagram API Docs
- [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Instagram Reels API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating-reels)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Access Tokens Guide](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)

### Tools
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
- [Facebook App Dashboard](https://developers.facebook.com/apps/)

---

## Security

- **NEVER commit `secrets.js`** to version control
- Keep access tokens secure
- Rotate tokens regularly
- `secrets.js` is already in `.gitignore`
- Use `secrets.template.js` for reference

---

## Pre-flight Checklist

Before posting content, verify:

- [ ] Instagram Business Account created (@midnightsoldiers)
- [ ] Instagram converted to Business account
- [ ] Instagram connected to Facebook Page
- [ ] Access token generated with Instagram permissions
- [ ] `secrets.js` updated with correct values
- [ ] `node checkTokenPermissions.js` shows all green
- [ ] Server restarted after config changes
- [ ] Video URL is publicly accessible

---

## You're Ready!

Once setup is complete, you can post reels to Facebook and Instagram via your API!

Need help? Check the documentation files listed above or run diagnostics:

```bash
node checkTokenPermissions.js
```

