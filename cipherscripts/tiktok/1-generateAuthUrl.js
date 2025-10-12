// ============================================
// STEP 1: Generate TikTok Authorization URL
// ============================================
// This script generates the URL you need to visit to authorize your TikTok app
// Run this script and open the generated URL in your browser

const { TIKTOK_CLIENT_KEY } = require("../../secrets.js");

// Configuration
const REDIRECT_URI = "http://localhost:3000/auth/tiktok/callback"; // Change this to your actual redirect URI
const SCOPES = [
  "video.upload",
  "video.publish",
  "user.info.basic",
].join(",");

// Generate random state for CSRF protection
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function generateAuthorizationUrl() {
  if (!TIKTOK_CLIENT_KEY) {
    console.error("❌ Error: TIKTOK_CLIENT_KEY is not set in secrets.js");
    process.exit(1);
  }

  const state = generateRandomState();
  
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state: state,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  console.log("\n" + "=".repeat(80));
  console.log("🎯 TIKTOK AUTHORIZATION URL");
  console.log("=".repeat(80));
  console.log("\n📋 Instructions:");
  console.log("1. Open the URL below in your browser");
  console.log("2. Log in to TikTok and authorize the app");
  console.log("3. You'll be redirected to your redirect_uri with a 'code' parameter");
  console.log("4. Copy the 'code' from the URL and use it in Step 2\n");
  console.log("🔗 Authorization URL:\n");
  console.log(authUrl);
  console.log("\n" + "=".repeat(80));
  console.log("📝 State (save this for verification):", state);
  console.log("🔄 Redirect URI:", REDIRECT_URI);
  console.log("🔐 Scopes:", SCOPES);
  console.log("=".repeat(80) + "\n");
}

// Run the script
generateAuthorizationUrl();

