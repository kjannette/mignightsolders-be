# Quick Start: New Instagram Account Setup

## TL;DR - Do These 3 Things

### 1. Create Instagram Account (5 minutes)
- Download Instagram app
- Create account: **@midnightsoldiers** (or similar)
- Username matters, use something related to your brand

### 2. Convert to Business & Connect (5 minutes)
**On Mobile App:**
- Settings → Account → Switch to Professional Account → Business
- When prompted, connect to Facebook Page: **midnightsol**

### 3. Update Backend (5 minutes)
```bash
cd /Users/kjannette/workspace/midnightsoldiers/midnightsoldiers-be

# Step 1: Generate new token
# Go to: https://developers.facebook.com/tools/explorer/
# Select app: midnightsol
# Generate token with Instagram permissions
# Copy the token

# Step 2: Edit generateLongLivedToken.js
# Update SHORT_LIVED_TOKEN with your new token

# Step 3: Generate long-lived token
node generateLongLivedToken.js
# Copy the Page Access Token from output

# Step 4: Update secrets.js automatically
node updateInstagramConfig.js
# Paste your Page Access Token when prompted
# Copy the output and replace secrets.js content

# Step 5: Verify it works
node checkTokenPermissions.js

# Should show:
# Token has the critical Instagram permissions
# Instagram Business Account found!
# Matches secrets.js configuration
```

---

## Detailed Guide

See **CREATE_NEW_INSTAGRAM_ACCOUNT.md** for full step-by-step instructions.

---

## Why This Approach?

**Clean slate** - No legacy issues from @ted_dancin_  
**Brand consistency** - Username matches your project  
**Full control** - You own it from day 1  
**API ready** - Properly configured for posting  

---

## Current vs New Setup

| Item | Current (Not Working) | New (Will Work) |
|------|----------------------|----------------|
| Instagram | @ted_dancin_ | @midnightsoldiers |
| Connection | Not connected | Connected |
| Account ID | 17841407775331305 | Will get new ID |
| Status | Permission errors | Ready to post |

---

## What You'll Need

- **Mobile device** (for Instagram Business setup)
- **Facebook Admin access** to your Page (862511466941111)
- **~15 minutes** of your time

---

## After Setup

Once connected, you can:
- Post reels from your backend
- Post videos to Facebook
- Access Instagram Insights
- Manage content via API

---

## Troubleshooting

If something doesn't work:

1. **Run diagnostic:**
   ```bash
   node checkTokenPermissions.js
   ```

2. **Check these:**
   - [ ] Instagram account is Business (not Personal)
   - [ ] Connected to correct Facebook Page
   - [ ] Token has `instagram_content_publish` permission
   - [ ] Backend server was restarted after updating secrets.js

3. **Still stuck?**
   - See full troubleshooting in CREATE_NEW_INSTAGRAM_ACCOUNT.md
   - Check Facebook/Instagram connection in Page Settings

---

## Files Reference

| File | Purpose |
|------|---------|
| `CREATE_NEW_INSTAGRAM_ACCOUNT.md` | Complete step-by-step guide |
| `updateInstagramConfig.js` | Helper to update secrets.js |
| `checkTokenPermissions.js` | Diagnostic tool |
| `generateLongLivedToken.js` | Generate 60-day access token |
| `secrets.js` | Your API credentials (UPDATE THIS) |

---

## Ready to Start?

1. Open **CREATE_NEW_INSTAGRAM_ACCOUNT.md** for detailed instructions
2. Or just follow the "TL;DR" section above for quick setup
3. Run `node updateInstagramConfig.js` when ready to update config

Let's get your Instagram posting working!

