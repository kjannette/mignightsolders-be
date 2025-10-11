/**
 * Check Token Permissions
 * 
 * This script checks what permissions your current access token has
 * and tells you if you have the required Instagram permissions.
 */

const { INSTAGRAM_ACCESS_TOKEN, FACEBOOK_PAGE_ID } = require('./secrets.js');

const FACEBOOK_API_VERSION = "v23.0";

async function checkTokenPermissions() {
  console.log("\n🔍 Checking Access Token Permissions...\n");
  console.log("========================================");
  
  try {
    // Check token debug info
    const debugUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token?input_token=${INSTAGRAM_ACCESS_TOKEN}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    const response = await fetch(debugUrl);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Error checking token:", error);
      return;
    }
    
    const data = await response.json();
    const tokenData = data.data;
    
    console.log("Token Info:");
    console.log("  App ID:", tokenData.app_id);
    console.log("  Type:", tokenData.type);
    console.log("  Valid:", tokenData.is_valid ? "✅ Yes" : "❌ No");
    console.log("  Expires:", tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : "Never");
    
    // Check scopes (permissions granted to the token)
    if (tokenData.scopes) {
      console.log("\n========================================");
      console.log("Token Scopes (Permissions):");
      console.log("========================================");
      tokenData.scopes.forEach(scope => {
        console.log(`  ✅ ${scope}`);
      });
    }
    console.log();
    
    // Check required Instagram permissions
    const requiredScopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights' // Alternative to instagram_basic
    ];
    
    console.log("========================================");
    console.log("Required Instagram Permissions Check:");
    console.log("========================================");
    
    const tokenScopes = tokenData.scopes || [];
    let hasContentPublish = false;
    let hasBasicOrInsights = false;
    
    requiredScopes.forEach(scope => {
      const hasScope = tokenScopes.includes(scope);
      if (hasScope) {
        console.log(`  ✅ ${scope}`);
        if (scope === 'instagram_content_publish') hasContentPublish = true;
        if (scope === 'instagram_basic' || scope === 'instagram_manage_insights') hasBasicOrInsights = true;
      } else {
        console.log(`  ❌ ${scope} - MISSING!`);
      }
    });
    console.log();
    
    if (hasContentPublish && hasBasicOrInsights) {
      console.log("✅ SUCCESS! Your token has the critical Instagram permissions.");
      console.log("   If you're still getting errors, check:");
      console.log("   1. Instagram Business Account ID is correct");
      console.log("   2. Instagram account is connected to Facebook Page");
      console.log("   3. Video URL is publicly accessible");
      console.log("   4. Your Facebook App has Instagram API access");
    } else {
      console.log("❌ MISSING CRITICAL PERMISSIONS!");
      if (!hasContentPublish) {
        console.log("   ⚠️  instagram_content_publish is REQUIRED to post reels!");
      }
      if (!hasBasicOrInsights) {
        console.log("   ⚠️  instagram_basic or instagram_manage_insights is REQUIRED!");
      }
      console.log("\n   Follow the instructions in INSTAGRAM_PERMISSIONS_FIX.md");
      console.log("   to generate a new token with the correct permissions.");
    }
    console.log();
    
    // Check Instagram Business Account
    console.log("========================================");
    console.log("Checking Instagram Business Account:");
    console.log("========================================");
    
    const igUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}?fields=instagram_business_account&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    const igResponse = await fetch(igUrl);
    
    if (!igResponse.ok) {
      const error = await igResponse.text();
      console.error("❌ Error checking Instagram account:", error);
      return;
    }
    
    const igData = await igResponse.json();
    
    if (igData.instagram_business_account) {
      console.log("  ✅ Instagram Business Account found!");
      console.log("  ID:", igData.instagram_business_account.id);
      
      if (igData.instagram_business_account.id === "17841407775331305") {
        console.log("  ✅ Matches secrets.js configuration");
      } else {
        console.log("  ⚠️  WARNING: Does NOT match secrets.js!");
        console.log("  Expected: 17841407775331305");
        console.log("  Found:", igData.instagram_business_account.id);
        console.log("  Update INSTAGRAM_BUSINESS_ACCOUNT_ID in secrets.js");
      }
    } else {
      console.log("  ❌ No Instagram Business Account connected to this page!");
      console.log("  Go to your Facebook Page → Settings → Instagram");
      console.log("  and connect your Instagram Business Account.");
    }
    console.log();
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the check
checkTokenPermissions();

