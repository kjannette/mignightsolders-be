# TikTok API Integration Setup Guide

## Overview
This guide will help you set up TikTok Content Posting API integration for your application. The integration allows you to programmatically upload and publish videos to TikTok.

## Prerequisites
- A TikTok account
- Access to TikTok for Developers portal
- Node.js environment

## Step 1: Create a TikTok Developer App

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Sign in with your TikTok account
3. Navigate to "Manage apps" or "My apps"
4. Click "Create an app"
5. Fill in the required information:
   - App name
   - Description
   - Category
   - Website URL (or localhost for development)

## Step 2: Add Content Posting API

1. In your app dashboard, go to "Add products"
2. Find and add "Content Posting API"
3. Configure the required settings:
   - Redirect URI (for OAuth callback)
   - Scopes needed:
     - `video.upload` - Upload video content
     - `video.publish` - Publish videos to TikTok

## Step 3: Get Access Token

TikTok uses OAuth 2.0 for authentication. There are two ways to get an access token:

### Option A: Using Login Kit (Recommended for testing)

1. Use TikTok Login Kit to authenticate users
2. Implement the OAuth flow in your application:
   ```javascript
   // Redirect user to TikTok authorization URL
   const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key={CLIENT_KEY}&scope=video.upload,video.publish&response_type=code&redirect_uri={REDIRECT_URI}`;
   ```

3. After user authorizes, TikTok redirects to your redirect_uri with a code
4. Exchange the authorization code for an access token:
   ```javascript
   POST https://open.tiktokapis.com/v2/oauth/token/
   {
     "client_key": "YOUR_CLIENT_KEY",
     "client_secret": "YOUR_CLIENT_SECRET",
     "code": "AUTHORIZATION_CODE",
     "grant_type": "authorization_code",
     "redirect_uri": "YOUR_REDIRECT_URI"
   }
   ```

### Option B: Using Server-to-Server (for production)

1. Use server-to-server authentication for automated posting
2. This requires additional verification and approval from TikTok

## Step 4: Configure Your Application

1. Copy `secrets.template.js` to `secrets.js` if you haven't already
2. Add your TikTok access token to `secrets.js`:
   ```javascript
   const TIKTOK_ACCESS_TOKEN = "your-access-token-here";
   ```

## Step 5: Token Refresh

**Important:** TikTok access tokens expire after 24 hours. You'll need to:

1. Store the refresh token you receive with the access token
2. Use the refresh token to get a new access token before it expires:
   ```javascript
   POST https://open.tiktokapis.com/v2/oauth/token/
   {
     "client_key": "YOUR_CLIENT_KEY",
     "client_secret": "YOUR_CLIENT_SECRET", 
     "grant_type": "refresh_token",
     "refresh_token": "YOUR_REFRESH_TOKEN"
   }
   ```

## Video Requirements

### File Specifications
- **Format:** MP4 (H.264 video codec, AAC audio codec)
- **Size:** Maximum 287.6 MB for direct upload
- **Duration:** 3 seconds to 10 minutes
- **Resolution:** Minimum 540p, recommended 720p or 1080p
- **Aspect Ratio:** 
  - Recommended: 9:16 (vertical)
  - Also supports: 1:1 (square), 16:9 (horizontal)
- **Frame Rate:** 23-60 FPS

### Content Guidelines
- Title: Maximum 150 characters
- Caption: Maximum 2,200 characters (including hashtags)
- Privacy levels:
  - `PUBLIC_TO_EVERYONE` - Public video
  - `MUTUAL_FOLLOW_FRIENDS` - Friends only
  - `SELF_ONLY` - Private/Draft

## Usage Example

### Using the TikTok API Service Directly

```javascript
const { postVideoToTikTok } = require('./postServices/tikTokApiService.js');

const videoData = {
  reelVideoUrl: "https://your-storage.com/video.mp4",
  reelSize: 25.5, // Size in MB
  reelName: "My Awesome Video",
  reelDescription: "Check out this cool video! #tiktokvideo #awesome",
  privacyLevel: "PUBLIC_TO_EVERYONE",
  disableDuet: false,
  disableComment: false,
  disableStitch: false,
  coverTimestamp: 1000, // Thumbnail at 1 second
};

const result = await postVideoToTikTok(videoData);
console.log('Upload result:', result);
```

### Using the Post Controller (Posts to all platforms)

```javascript
const postController = require('./postController/postController.js');

const reelData = {
  reelVideoUrl: "https://your-storage.com/video.mp4",
  reelSize: 25.5,
  reelName: "My Awesome Video",
  reelDescription: "Check out this cool video! #tiktokvideo #awesome",
};

// Posts to Facebook, Instagram, AND TikTok simultaneously
const result = await postController.handleReelPost(reelData);
console.log('Results:', result.results);
```

## API Workflow

The TikTok posting process follows these steps:

1. **Initialize Upload** - Create an upload session and get publish_id + upload_url
2. **Upload Video** - Upload the video file to TikTok's servers
3. **Wait for Processing** - Poll the status until video is processed
4. **Publish Complete** - Video is published to TikTok

All of this is handled automatically by the `postVideoToTikTok()` function.

## Common Issues

### "Invalid Access Token"
- Your token may have expired (24 hour lifetime)
- Refresh your access token using the refresh token
- Verify the token has the required scopes

### "Video processing failed"
- Check that your video meets the format requirements
- Ensure video URL is publicly accessible
- Verify file size is under 287.6 MB

### "Upload timeout"
- Large videos may take longer to process
- Default timeout is 5 minutes - you can increase it
- Check your internet connection and video hosting service

### "Permission denied"
- Ensure your app has `video.upload` and `video.publish` scopes
- Verify the user authorized your app with these scopes
- Check that your TikTok account is in good standing

## Testing

You can test the TikTok integration by:

```javascript
const { postVideoToTikTok } = require('./postServices/tikTokApiService.js');

// Use a test video
const testData = {
  reelVideoUrl: "https://example.com/test-video.mp4",
  reelSize: 5.2,
  reelName: "Test Video",
  reelDescription: "Testing TikTok API integration",
  privacyLevel: "SELF_ONLY", // Start with private videos for testing
};

postVideoToTikTok(testData)
  .then(result => console.log('Success!', result))
  .catch(error => console.error('Error:', error));
```

## Rate Limits

TikTok has rate limits on their API:
- Video uploads: Check current limits in TikTok Developer Portal
- API calls: Varies by endpoint
- Consider implementing retry logic for rate limit errors

## Resources

- [TikTok for Developers](https://developers.tiktok.com/)
- [Content Posting API Documentation](https://developers.tiktok.com/doc/content-posting-api-overview/)
- [OAuth Documentation](https://developers.tiktok.com/doc/oauth-user-access-token-management/)
- [API Reference](https://developers.tiktok.com/doc/content-posting-api-reference/)

## Support

For TikTok API issues:
- Check the [TikTok Developer Forum](https://developers.tiktok.com/community/)
- Review the [API Status Page](https://developers.tiktok.com/status/)
- Contact TikTok Developer Support through the developer portal

## Privacy & Data Handling

Remember to:
- Handle user tokens securely
- Follow TikTok's data usage policies
- Respect user privacy and content rights
- Comply with TikTok's Community Guidelines
- Store credentials in environment variables or secure config (never commit to git)

