# Create New Instagram Account for Midnight Soldiers

## Overview

This guide will walk you through:
1. Creating a new Instagram account: **@midnightsoldiers**
2. Converting it to a Business account
3. Connecting it to your Facebook Page
4. Updating your backend configuration
5. Testing the connection

---

## Step 1: Create New Instagram Account

### Option A: Using Mobile App (Recommended)

1. **Download Instagram** (if not already installed)
   - iOS: App Store
   - Android: Google Play Store

2. **Open Instagram app**

3. **Sign Up for New Account:**
   - Tap "Sign up"
   - **Email:** Use a dedicated email (e.g., midnightsoldiers@yourdomain.com)
   - **Username:** `midnightsoldiers` (check if available)
   - **Password:** Use a strong password and save it securely
   - **Name:** Midnight Soldiers

4. **Complete the setup:**
   - Skip "Find Friends" (or connect if you want)
   - Skip "Follow People" (or follow if you want)
   - Add profile picture (optional for now)
   - Add bio (optional for now)

### Option B: Using Desktop

1. Go to https://www.instagram.com/
2. Click "Sign up"
3. Follow the same steps as mobile

---

## Step 2: Convert to Business Account

**IMPORTANT:** You must do this on mobile (not desktop)

1. **Open Instagram app** and log into your new account

2. **Go to Profile** (tap your profile icon)

3. **Open Settings:**
   - Tap the menu icon (☰ three lines) in the top right
   - Tap **"Settings and privacy"** (or just "Settings")

4. **Switch to Professional Account:**
   - Tap **"Account type and tools"** or **"Account"**
   - Tap **"Switch to Professional Account"**
   - Choose **"Business"** (not Creator)
   - Select a category (e.g., "Art", "Entertainment", "Music", etc.)
   - Tap **"Done"**

5. **Review your contact information:**
   - Add email, phone number if needed
   - Tap **"Next"**

6. **Connect to Facebook Page:**
   - You'll be prompted: "Connect your Page"
   - Tap **"Connect"** or **"Connect to Facebook Page"**
   - Log in to Facebook if needed
   - **Select:** "midnightsol" or your Facebook Page (ID: 862511466941111)
   - Tap **"Continue"** and confirm

7. **Complete the setup:**
   - Review and save

---

## Step 3: Verify Connection on Facebook

1. **Go to Facebook Page:**
   - Visit: https://www.facebook.com/862511466941111
   - Or search for your page name

2. **Open Settings:**
   - Click "Settings" in the left sidebar

3. **Check Instagram Connection:**
   - Look for "Instagram" or "Linked Accounts" section
   - You should see: "Connected to @midnightsoldiers"
   - If not connected, click "Connect Account" and follow prompts

---

## Step 4: Get Instagram Business Account ID

### Method 1: Using Our Diagnostic Script

1. **First, generate a new access token** (to ensure it has the connection):
   
   ```bash
   cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be
   ```

2. **Generate new token:**
   - Go to https://developers.facebook.com/tools/explorer/
   - Select your app: **midnightsol**
   - Click **"Generate Access Token"**
   - Make sure these permissions are checked:
     * `pages_show_list`
     * `pages_read_engagement`
     * `pages_manage_posts`
     * `instagram_manage_insights`
     * `instagram_content_publish`
   - Click **"Generate Access Token"**
   - **Copy the token**

3. **Update generateLongLivedToken.js:**
   - Open `generateLongLivedToken.js`
   - Update `SHORT_LIVED_TOKEN` with your new token
   - Save the file

4. **Generate long-lived token:**
   ```bash
   node generateLongLivedToken.js
   ```
   - Copy the Page Access Token

5. **Update secrets.js temporarily:**
   - Open `secrets.js`
   - Update both `FACEBOOK_PAGE_ACCESS_TOKEN` and `INSTAGRAM_ACCESS_TOKEN` with the new token
   - Save the file

6. **Run diagnostic to get Instagram ID:**
   ```bash
   node checkTokenPermissions.js
   ```
   - Look for: "Instagram Business Account found! ID: XXXXXXXXXXXXXXXXX"
   - **Copy this ID** - you'll need it for Step 5

### Method 2: Using Graph API Explorer

1. Go to https://developers.facebook.com/tools/explorer/
2. Make sure your access token is selected
3. Make a GET request to:
   ```
   /me/accounts?fields=instagram_business_account
   ```
4. Find your page in the results
5. Copy the `instagram_business_account.id` value

---

## Step 5: Update Backend Configuration

1. **Open `secrets.js`:**
   ```bash
   cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be
   ```

2. **Update these values:**
   ```javascript
   const INSTAGRAM_BUSINESS_ACCOUNT_ID = "YOUR_NEW_IG_BUSINESS_ID"; // From Step 4
   const INSTAGRAM_ACCESS_TOKEN = "YOUR_NEW_PAGE_ACCESS_TOKEN"; // From Step 4
   const FACEBOOK_PAGE_ACCESS_TOKEN = "YOUR_NEW_PAGE_ACCESS_TOKEN"; // Same token
   ```

3. **Add a comment with today's date:**
   ```javascript
   // Long-lived token (60 days) with Instagram permissions - Generated: [TODAY'S DATE]
   // Connected to Instagram: @midnightsoldiers
   ```

4. **Save the file**

---

## Step 6: Test the Connection

1. **Verify token has all permissions:**
   ```bash
   node checkTokenPermissions.js
   ```
   
   You should see:
   ```
   SUCCESS! Your token has the critical Instagram permissions.
   Instagram Business Account found!
   ID: [your new ID]
   Matches secrets.js configuration
   ```

2. **Restart your backend server**

3. **Try posting a reel:**
   - Use your frontend to post a test reel
   - Check the console logs for success
   - Check Instagram to verify the post appears

---

## Step 7: Update Username Documentation (Optional)

Update any documentation or comments that reference `@ted_dancin_` to `@midnightsoldiers`

---

## Troubleshooting

### "Username 'midnightsoldiers' is not available"

Try these alternatives:
- `midnight_soldiers`
- `midnightsoldiers_official`
- `midnightsoldiers_art`
- `midnightsol` (to match your Facebook page name)

### "Can't switch to Business Account"

- Make sure you're using the mobile app (desktop doesn't support this)
- Make sure the account is at least 1 day old
- Make sure you've added a profile picture and bio
- Try logging out and back in

### "Can't connect to Facebook Page"

- Make sure you're an Admin of the Facebook Page
- Make sure the Instagram account isn't already connected to another page
- Try disconnecting any existing connections first
- Make sure you're logged into the correct Facebook account

### "Instagram Business Account not showing up"

- Wait 5-10 minutes after connecting (Facebook's systems need to sync)
- Generate a brand new access token
- Check that the connection is showing on both Instagram and Facebook

### "Still getting permission errors"

- Make sure you generated a NEW access token AFTER connecting Instagram
- Make sure the token has `instagram_content_publish` permission
- Make sure your Facebook App has Instagram API access enabled
- Check that your app is not in restricted mode

---

## Quick Checklist

- [ ] Create new Instagram account: @midnightsoldiers (or variant)
- [ ] Convert to Business Account (via mobile app)
- [ ] Connect to Facebook Page: midnightsol (ID: 862511466941111)
- [ ] Verify connection on Facebook Page settings
- [ ] Generate new short-lived token with Instagram permissions
- [ ] Convert to long-lived token using generateLongLivedToken.js
- [ ] Get new Instagram Business Account ID
- [ ] Update INSTAGRAM_BUSINESS_ACCOUNT_ID in secrets.js
- [ ] Update INSTAGRAM_ACCESS_TOKEN in secrets.js
- [ ] Update FACEBOOK_PAGE_ACCESS_TOKEN in secrets.js
- [ ] Run checkTokenPermissions.js to verify
- [ ] Restart backend server
- [ ] Test posting a reel

---

## Expected Configuration

After completing all steps, your `secrets.js` should look like:

```javascript
const FACEBOOK_PAGE_ID = "862511466941111";
const FACEBOOK_PAGE_ACCESS_TOKEN = "[YOUR_NEW_60_DAY_TOKEN]"; // Generated: [DATE]
const INSTAGRAM_BUSINESS_ACCOUNT_ID = "[YOUR_NEW_IG_BUSINESS_ID]"; // @midnightsoldiers
const INSTAGRAM_ACCESS_TOKEN = "[YOUR_NEW_60_DAY_TOKEN]"; // Same as page token
```

---

## Benefits of New Account

**Clean slate:** No legacy connection issues  
**Full control:** You own the account from day 1  
**Brand consistency:** Username matches your Facebook page  
**Properly configured:** Business account set up correctly from the start  
**API ready:** Connected and configured for API posting  

---

## Next Steps After Setup

1. **Customize your Instagram profile:**
   - Add profile picture (your logo)
   - Write a compelling bio
   - Add link to your website
   - Create Instagram Story Highlights

2. **Post your first reel** to test everything works

3. **Set up content calendar** for regular posting

4. **Monitor analytics** through Instagram Insights

---

## Need Help?

If you run into issues at any step:
1. Run `node checkTokenPermissions.js` to diagnose
2. Check the troubleshooting section above
3. Review Instagram's official documentation:
   - [Instagram Business Account](https://help.instagram.com/502981923235522)
   - [Connect Instagram to Facebook Page](https://www.facebook.com/business/help/898752960195806)

