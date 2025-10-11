# Fix Instagram OAuth Permission Error

## The Problem
Error: `(#10) Application does not have permission for this action`

This means your Facebook/Instagram access token doesn't have the required permissions to post reels.

## Step-by-Step Fix

### Step 1: Configure Facebook App Settings

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Select your app: **midnightsol** (App ID: 1453446205748046)
3. In the left sidebar, go to **App Settings** → **Basic**
4. Scroll down to **App Domains** and make sure your domains are listed
5. Go to **Use Cases** in the left sidebar
6. Make sure you have the **Instagram** use case enabled
7. Under Instagram use case, ensure these permissions are added:
   - `instagram_basic` (or `instagram_manage_insights`)
   - `instagram_content_publish` ← **CRITICAL**

### Step 2: Connect Instagram Business Account

1. In Facebook Developers, go to **Instagram Basic Display** or **Instagram Graph API**
2. Make sure your Instagram Business Account (@ted_dancin_) is connected
3. Verify the Instagram Business Account ID: **17841407775331305**

### Step 3: Generate New Access Token with Correct Permissions

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app: **midnightsol**
3. Click **Generate Access Token**
4. In the permissions dialog, select these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic` (or `instagram_manage_insights` for newer API versions)
   - `instagram_content_publish` **THIS IS THE KEY ONE**
5. Complete the login flow and grant permissions
6. Copy the generated short-lived token

### Step 4: Generate Long-Lived Token

1. Open `generateLongLivedToken.js`
2. Update the `SHORT_LIVED_TOKEN` constant with the token from Step 3
3. Run the script:
   ```bash
   cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be
   node generateLongLivedToken.js
   ```
4. Copy the generated long-lived Page Access Token

### Step 5: Update secrets.js

1. Open `secrets.js`
2. Update these values:
   ```javascript
   const FACEBOOK_PAGE_ACCESS_TOKEN = "YOUR_NEW_TOKEN_HERE";
   const INSTAGRAM_ACCESS_TOKEN = "YOUR_NEW_TOKEN_HERE"; // Same token
   ```
3. Add a comment with the date generated:
   ```javascript
   // Long-lived token (60 days) with Instagram permissions - Generated: Oct 11, 2025
   ```

### Step 6: Verify Instagram Business Account

To double-check your Instagram Business Account ID is correct:

1. Go to Graph API Explorer
2. Use your new token
3. Make a GET request to: `/me/accounts?fields=instagram_business_account`
4. Find your page and verify the `instagram_business_account.id` matches: **17841407775331305**

### Step 7: Test Your Setup

1. Restart your backend server
2. Try posting a reel again
3. Check the console logs for success

## Common Issues

### "Invalid OAuth Access Token"
- Your token has expired (tokens last ~60 days)
- Generate a new token following Steps 3-5

### "Instagram Account Not Found"
- Your Instagram account is not a Business account
- Your Instagram Business Account is not connected to your Facebook Page
- Go to your Facebook Page → Settings → Instagram → Connect Account

### "Application Not Approved"
- Your Facebook App needs to go through App Review for production use
- For testing, make sure the Instagram account is added as a Test User or Admin

### "Unsupported request"
- Make sure you're using the correct API version (v23.0 or later)
- Check that the video URL is publicly accessible

## Required Facebook App Setup Checklist

- [ ] App is in Development or Live mode
- [ ] Instagram Graph API product is added
- [ ] Instagram use case is configured
- [ ] `instagram_content_publish` permission is added to the use case
- [ ] Instagram Business Account is connected to Facebook Page
- [ ] Facebook Page is connected to your app
- [ ] Access token has all required permissions
- [ ] Token is not expired (regenerate every 60 days)

## Need More Help?

Facebook Instagram API Documentation:
- [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Instagram Reels](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating-reels)
- [Access Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [Permissions](https://developers.facebook.com/docs/permissions/reference)

