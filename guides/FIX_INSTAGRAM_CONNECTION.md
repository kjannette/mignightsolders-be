# Fix Instagram Business Account Connection

## The Problem - IDENTIFIED

Your access token has all the required permissions:
- `instagram_content_publish`
- `instagram_manage_insights`
- `pages_manage_posts`
- All other required permissions

**BUT:** Your Instagram Business Account is NOT connected to your Facebook Page!

## The Solution

### Step 1: Connect Instagram to Facebook Page

1. **Go to your Facebook Page** (the one with ID: 862511466941111)
   - Visit: https://www.facebook.com/862511466941111

2. **Click "Settings"** in the left menu

3. **Find "Instagram"** in the settings menu
   - Look for "Linked accounts" or "Instagram" section
   - Or go directly to: Settings → Instagram

4. **Click "Connect Account"**

5. **Log in to your Instagram Business Account** (@ted_dancin_)
   - Make sure you're logging into the BUSINESS account, not personal
   - If you don't have a Business account, you need to convert it first

6. **Authorize the connection**
   - Grant all permissions when prompted
   - Complete the connection flow

### Step 2: Convert Instagram to Business Account (if needed)

If your Instagram account is NOT a Business account:

1. Open Instagram app on your phone
2. Go to your profile (@ted_dancin_)
3. Tap the menu (three lines) → Settings
4. Tap **"Account"**
5. Tap **"Switch to Professional Account"**
6. Choose **"Business"** (not Creator)
7. Follow the setup wizard
8. Connect it to your Facebook Page when prompted

### Step 3: Verify the Connection

After connecting, run this command to verify:

```bash
cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be
node checkTokenPermissions.js
```

You should see:
```
Instagram Business Account found!
ID: 17841407775331305
Matches secrets.js configuration
```

### Step 4: Test Posting a Reel

Once connected, try posting a reel again. It should work now!

## Common Issues

### "I don't see an Instagram option in my Page settings"
- Make sure you're an Admin of the Facebook Page
- Make sure your Instagram account is a Business or Creator account
- Try accessing via desktop Facebook (not mobile)

### "Connection fails when I try to connect"
- Make sure you're logged into the correct Instagram account
- Make sure your Instagram account is not already connected to another page
- Try disconnecting and reconnecting

### "Instagram Business Account ID doesn't match"
- After connecting, the script will show you the correct ID
- Update `INSTAGRAM_BUSINESS_ACCOUNT_ID` in `secrets.js` with the correct ID

### "I connected it but still getting errors"
- Wait a few minutes for Facebook's systems to sync
- Restart your backend server
- Generate a new access token (the connection might require a fresh token)

## Why This Happened

The Facebook/Instagram API requires:
1. Correct permissions on the access token (YOU HAVE THIS)
2. Instagram Business Account connected to Facebook Page (YOU'RE MISSING THIS)

Without the connection, the API doesn't know which Instagram account to post to, even though you have the right permissions.

## Need Help?

Facebook Documentation:
- [Connect Instagram to Page](https://www.facebook.com/business/help/898752960195806)
- [Instagram Business Account](https://help.instagram.com/502981923235522)
- [Troubleshooting](https://www.facebook.com/business/help/1148909221857370)

