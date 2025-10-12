# Platform Configuration Guide

## Overview

This application treats **Facebook**, **Instagram**, and **TikTok** as **completely independent platforms**. You can configure any combination of these platforms - from just one platform to all three. The system will automatically post to whichever platforms you have configured.

## Why Independent Platforms?

Not everyone has accounts on all platforms! This approach allows:
- ✅ Post to only Facebook (if you don't have Instagram)
- ✅ Post to only Instagram (if you don't have Facebook)
- ✅ Post to only TikTok (if you prefer)
- ✅ Post to any combination of the above
- ✅ Each platform has its own credentials and configuration
- ✅ No dependencies between platforms

## Configuration

### File: `secrets.js`

This file contains credentials for each platform. Configure only the platforms you want to use.

```javascript
// ============================================
// FACEBOOK CREDENTIALS (Independent Platform #1)
// ============================================
const FACEBOOK_PAGE_ID = "your-facebook-page-id";
const FACEBOOK_PAGE_ACCESS_TOKEN = "your-facebook-access-token";

// ============================================
// INSTAGRAM CREDENTIALS (Independent Platform #2)
// ============================================
const INSTAGRAM_BUSINESS_ACCOUNT_ID = "your-instagram-business-account-id";
const INSTAGRAM_ACCESS_TOKEN = "your-instagram-access-token";

// ============================================
// TIKTOK CREDENTIALS (Independent Platform #3)
// ============================================
// Add TikTok credentials when ready
```

### To Disable a Platform

Simply set the platform's credentials to empty strings or `null`:

```javascript
// Disable Facebook
const FACEBOOK_PAGE_ID = "";
const FACEBOOK_PAGE_ACCESS_TOKEN = "";

// Instagram remains enabled
const INSTAGRAM_BUSINESS_ACCOUNT_ID = "17841407775331305";
const INSTAGRAM_ACCESS_TOKEN = "EAAUp5tDLM04...";
```

## How It Works

### 1. **Platform Detection**

Each API service checks if its platform is configured before attempting to post:

```javascript
// In facebookApiService.js
if (!isFacebookConfigured()) {
  return {
    success: false,
    skipped: true,
    message: "Facebook credentials not configured"
  };
}
```

### 2. **Parallel Posting**

The `PostController` posts to all platforms in parallel using `Promise.allSettled`:

```javascript
const [facebookResult, instagramResult, tiktokResult] = await Promise.allSettled([
  postReelToFacebook(reelData),
  postReelToInstagram(reelData),
  postVideoToTikTok(reelData),
]);
```

### 3. **Result Handling**

Results are categorized as:
- **Success**: Platform posted successfully
- **Skipped**: Platform not configured (credentials missing)
- **Failed**: Platform is configured but posting failed

### 4. **Success Criteria**

The overall request is considered successful if **at least one configured platform** posts successfully.

## API Response Format

### Example 1: All Platforms Configured and Successful

```json
{
  "success": true,
  "message": "Successfully posted to all configured platforms (facebook, instagram, tiktok)",
  "results": {
    "facebook": {
      "success": true,
      "skipped": false,
      "data": { ... },
      "error": null
    },
    "instagram": {
      "success": true,
      "skipped": false,
      "data": { ... },
      "error": null
    },
    "tiktok": {
      "success": true,
      "skipped": false,
      "data": { ... },
      "error": null
    }
  },
  "summary": {
    "total": 3,
    "configured": 3,
    "attempted": 3,
    "successful": 3,
    "skipped": 0
  }
}
```

### Example 2: Only Instagram Configured

```json
{
  "success": true,
  "message": "Successfully posted to all configured platforms (instagram)",
  "results": {
    "facebook": {
      "success": false,
      "skipped": true,
      "message": "Facebook credentials not configured",
      "data": null,
      "error": null
    },
    "instagram": {
      "success": true,
      "skipped": false,
      "data": { ... },
      "error": null
    },
    "tiktok": {
      "success": false,
      "skipped": true,
      "message": "TikTok credentials not configured",
      "data": null,
      "error": null
    }
  },
  "summary": {
    "total": 3,
    "configured": 1,
    "attempted": 1,
    "successful": 1,
    "skipped": 2
  }
}
```

### Example 3: Facebook Configured but Failed, Instagram Successful

```json
{
  "success": true,
  "message": "Partially successful: Posted to instagram",
  "results": {
    "facebook": {
      "success": false,
      "skipped": false,
      "data": null,
      "error": "Failed to upload video: timeout"
    },
    "instagram": {
      "success": true,
      "skipped": false,
      "data": { ... },
      "error": null
    },
    "tiktok": {
      "success": false,
      "skipped": true,
      "message": "TikTok credentials not configured",
      "data": null,
      "error": null
    }
  },
  "summary": {
    "total": 3,
    "configured": 2,
    "attempted": 2,
    "successful": 1,
    "skipped": 1
  }
}
```

### Example 4: No Platforms Configured

```json
{
  "success": false,
  "message": "No platforms configured. Please configure at least one platform (Facebook, Instagram, or TikTok).",
  "results": {
    "facebook": { "success": false, "skipped": true, ... },
    "instagram": { "success": false, "skipped": true, ... },
    "tiktok": { "success": false, "skipped": true, ... }
  },
  "summary": {
    "total": 3,
    "configured": 0,
    "attempted": 0,
    "successful": 0,
    "skipped": 3
  }
}
```

## Platform-Specific Notes

### Facebook

- Requires a **Facebook Page**
- Requires **Page Access Token** with permissions:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- Video requirements:
  - Max size: 4GB
  - Format: MP4 recommended
  - Aspect ratio: 9:16 for reels

### Instagram

- Requires an **Instagram Business Account**
- Requires **Access Token** with permissions:
  - `instagram_basic`
  - `instagram_content_publish`
- Video requirements:
  - Recommended size: <100MB
  - Max size: 1GB
  - Duration: 15-90 seconds recommended
  - Aspect ratio: 9:16
  - Must be publicly accessible URL

### TikTok

- Configuration pending
- Independent from Facebook and Instagram
- Will work the same way once credentials are added

## Best Practices

1. **Start with One Platform**: Configure and test one platform at a time
2. **Monitor Logs**: Check server logs to see which platforms are being attempted
3. **Handle Partial Success**: Your frontend should handle cases where some platforms succeed and others fail
4. **Token Refresh**: Both Facebook and Instagram tokens expire - set up token refresh
5. **Error Handling**: Display specific error messages for each platform to users

## Testing

### Test Individual Platform

Use the test endpoints to verify each platform independently:

```bash
# Test Facebook only
POST /test/facebook-reel
{
  "videoFileName": "test.mp4",
  "reelName": "Test Reel",
  "reelDescription": "Test post"
}

# Test Instagram only
POST /test/instagram-reel
{
  "videoFileName": "test.mp4",
  "reelName": "Test Reel",
  "reelDescription": "Test post"
}
```

### Test All Configured Platforms

```bash
POST /v1/accept-reel-data/test-123
{
  "reelVideoUrl": "https://example.com/video.mp4",
  "reelSize": 25.5,
  "reelName": "Test Reel",
  "reelDescription": "Testing multi-platform post"
}
```

## Troubleshooting

### Platform Shows as Skipped

- Check that credentials are set in `secrets.js`
- Verify `isFacebookConfigured()` or `isInstagramConfigured()` returns `true`
- Restart the server after updating `secrets.js`

### Platform Fails to Post

- Check server logs for detailed error messages
- Verify access tokens are valid and not expired
- Ensure video URL is publicly accessible
- Check file size and format requirements

### All Platforms Fail

- Verify video URL is valid and accessible
- Check file size is within limits
- Ensure network connectivity from server to social media APIs
- Review API rate limits

## Migration from Linked Approach

If you previously had Facebook and Instagram linked through Facebook Business:

1. **No code changes needed** - the system already supports this
2. You can use the **same access token** for both platforms if desired
3. Or you can get **separate tokens** for each platform for true independence
4. The choice is yours!

Current setup (both can use same token if linked via Facebook Business):
```javascript
const FACEBOOK_PAGE_ACCESS_TOKEN = "EAAUp5tDLM04...";
const INSTAGRAM_ACCESS_TOKEN = "EAAUp5tDLM04..."; // Same token works
```

Or use separate tokens (if platforms are not linked):
```javascript
const FACEBOOK_PAGE_ACCESS_TOKEN = "facebook-specific-token";
const INSTAGRAM_ACCESS_TOKEN = "instagram-specific-token";
```

## Summary

The system now treats each platform as an independent entity:
- ✅ **Configure** any combination of platforms
- ✅ **Post** to all configured platforms automatically
- ✅ **Succeed** if at least one platform posts successfully
- ✅ **Skip** platforms that aren't configured
- ✅ **Report** detailed results for each platform
- ✅ **No dependencies** between platforms

