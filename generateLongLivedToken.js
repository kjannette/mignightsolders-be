/**
 * Facebook Long-Lived Token Generator
 * 
 * This script helps you generate a long-lived Facebook access token
 * that lasts approximately 60 days.
 * 
 * Usage:
 * 1. Get a short-lived User Access Token from Facebook Graph API Explorer
 *    https://developers.facebook.com/tools/explorer/
 * 2. Add your App ID, App Secret, and short-lived token below
 * 3. Run: node generateLongLivedToken.js
 */

const FACEBOOK_API_VERSION = "v23.0";

// ============================================
// FILL IN THESE VALUES:
// ============================================
const APP_ID = "1453446205748046";
const APP_SECRET = "b04fed741855317aee871475cb138383";
const SHORT_LIVED_TOKEN = "EAAUp5tDLM04BPg0xi1AOMPP6RC4GpJBLWW49RT34NiwAhcwb94lt3fLRcd6wR9MEBK5Y3XZB2opkBds0SkfJOQPZAQqrcs5k4COKlWBhSZAXhM96F0TZAyhg9PluhGSSF9De9xJsXZCPvPZBEyQtAJfB99411NsCFKTZCvLlW545uyrcIYUlxUFOZA2MkWrMdTqtTmC3nZBPATLBHxioEfPNKFVCZCg0oo1aLOTHMtYLFBFQZDZD";
// ============================================

async function generateLongLivedUserToken() {
  console.log("\n========================================");
  console.log("Step 1: Generating Long-Lived User Token");
  console.log("========================================\n");

  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_LIVED_TOKEN}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Error getting long-lived user token:");
      console.error(error);
      return null;
    }

    const data = await response.json();
    console.log("✅ Long-Lived User Token generated successfully!");
    console.log("Token:", data.access_token);
    console.log("Expires in:", data.expires_in, "seconds (~", Math.round(data.expires_in / 86400), "days)");
    console.log();
    
    return data.access_token;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

async function getPageAccessToken(userToken) {
  console.log("========================================");
  console.log("Step 2: Getting Page Access Token");
  console.log("========================================\n");

  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?access_token=${userToken}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Error getting page tokens:");
      console.error(error);
      return;
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log("⚠️  No pages found for this user");
      return;
    }

    console.log("✅ Found", data.data.length, "page(s):\n");
    
    data.data.forEach((page, index) => {
      console.log(`\n--- Page ${index + 1}: ${page.name} ---`);
      console.log("Page ID:", page.id);
      console.log("Page Access Token:", page.access_token);
      console.log("Category:", page.category);
      console.log("Tasks:", page.tasks ? page.tasks.join(", ") : "N/A");
    });

    console.log("\n========================================");
    console.log("✅ NEXT STEPS:");
    console.log("========================================");
    console.log("1. Copy the Page Access Token for your page");
    console.log("2. Update secrets.js with:");
    console.log("   - FACEBOOK_PAGE_ID: (Page ID from above)");
    console.log("   - FACEBOOK_PAGE_ACCESS_TOKEN: (Page Access Token from above)");
    console.log("3. Restart your backend server");
    console.log("========================================\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function main() {
  console.log("\n🚀 Facebook Long-Lived Token Generator\n");

  // Validation
  if (APP_ID === "YOUR_APP_ID_HERE" || 
      APP_SECRET === "YOUR_APP_SECRET_HERE" || 
      SHORT_LIVED_TOKEN === "YOUR_SHORT_LIVED_USER_TOKEN_HERE") {
    console.error("❌ ERROR: Please fill in APP_ID, APP_SECRET, and SHORT_LIVED_TOKEN at the top of this file\n");
    console.log("📝 How to get these values:");
    console.log("1. Go to https://developers.facebook.com/apps/");
    console.log("2. Select your app (or create one)");
    console.log("3. Get APP_ID from the app dashboard");
    console.log("4. Get APP_SECRET from Settings > Basic > App Secret");
    console.log("5. Get SHORT_LIVED_TOKEN from https://developers.facebook.com/tools/explorer/");
    console.log("   - Select your app");
    console.log("   - Click 'Generate Access Token'");
    console.log("   - Grant permissions: pages_show_list, pages_read_engagement, pages_manage_posts");
    console.log();
    return;
  }

  // Step 1: Get long-lived user token
  const longLivedUserToken = await generateLongLivedUserToken();
  
  if (!longLivedUserToken) {
    console.error("\n❌ Failed to generate long-lived user token. Please check your credentials.\n");
    return;
  }

  // Step 2: Get page access token
  await getPageAccessToken(longLivedUserToken);
}

// Run the script
main();

