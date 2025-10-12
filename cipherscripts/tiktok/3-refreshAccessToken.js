// ============================================
// STEP 3: Refresh TikTok Access Token
// ============================================
// This script refreshes the TikTok access token using the refresh token
// Run this script manually or set it up as a cron job to run every 12-24 hours

const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN } = require("../../secrets.js");
const fs = require("fs");
const path = require("path");

async function refreshAccessToken() {
  console.log("\n" + "=".repeat(80));
  console.log("🔄 REFRESHING TIKTOK ACCESS TOKEN");
  console.log("=".repeat(80));
  console.log("⏰ Started at:", new Date().toISOString());
  console.log("=".repeat(80) + "\n");

  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    console.error("❌ Error: TikTok credentials are not set in secrets.js");
    process.exit(1);
  }

  if (!TIKTOK_REFRESH_TOKEN) {
    console.error("❌ Error: TIKTOK_REFRESH_TOKEN is not set in secrets.js");
    console.error("Please run Step 2 first to get the initial tokens");
    process.exit(1);
  }

  const url = "https://open.tiktokapis.com/v2/oauth/token/";
  
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    client_secret: TIKTOK_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: TIKTOK_REFRESH_TOKEN,
  });

  try {
    console.log("⏳ Making request to TikTok API...\n");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error from TikTok API:");
      console.error(JSON.stringify(data, null, 2));
      
      // Log to file for debugging
      logError(data);
      process.exit(1);
    }

    console.log("✅ SUCCESS! Token refreshed:\n");
    console.log("=".repeat(80));
    console.log("🎉 NEW TOKEN DETAILS");
    console.log("=".repeat(80));
    console.log("🔑 New Access Token:", data.access_token.substring(0, 20) + "...");
    console.log("🔄 New Refresh Token:", data.refresh_token.substring(0, 20) + "...");
    console.log("👤 Open ID:", data.open_id);
    console.log("⏰ Expires In:", data.expires_in, "seconds (24 hours)");
    console.log("🔐 Scopes:", data.scope);
    console.log("=".repeat(80) + "\n");

    // Update secrets.js file
    updateSecretsFile(data.access_token, data.refresh_token);

    // Log success
    logSuccess(data);

  } catch (error) {
    console.error("❌ Error refreshing access token:");
    console.error(error);
    logError(error);
    process.exit(1);
  }
}

function updateSecretsFile(accessToken, refreshToken) {
  try {
    const secretsPath = path.join(__dirname, "../../secrets.js");
    let secretsContent = fs.readFileSync(secretsPath, "utf8");

    // Update TIKTOK_ACCESS_TOKEN
    secretsContent = secretsContent.replace(
      /const TIKTOK_ACCESS_TOKEN = ".*";/,
      `const TIKTOK_ACCESS_TOKEN = "${accessToken}";`
    );

    // Update TIKTOK_REFRESH_TOKEN
    secretsContent = secretsContent.replace(
      /const TIKTOK_REFRESH_TOKEN = ".*";/,
      `const TIKTOK_REFRESH_TOKEN = "${refreshToken}";`
    );

    fs.writeFileSync(secretsPath, secretsContent, "utf8");

    console.log("✅ Updated secrets.js with new tokens!");
    console.log("📝 File updated:", secretsPath);
    console.log("⏰ Next refresh should run in 12-24 hours\n");
  } catch (error) {
    console.error("❌ Error updating secrets.js:");
    console.error(error);
    console.log("\n⚠️  Please manually update secrets.js with these values:");
    console.log(`TIKTOK_ACCESS_TOKEN = "${accessToken}";`);
    console.log(`TIKTOK_REFRESH_TOKEN = "${refreshToken}";`);
  }
}

function logSuccess(data) {
  const logDir = path.join(__dirname, "../../logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, "tiktok-token-refresh.log");
  const logEntry = `[${new Date().toISOString()}] SUCCESS - Token refreshed. Expires in ${data.expires_in}s\n`;
  
  fs.appendFileSync(logFile, logEntry, "utf8");
}

function logError(error) {
  const logDir = path.join(__dirname, "../../logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, "tiktok-token-refresh.log");
  const logEntry = `[${new Date().toISOString()}] ERROR - ${JSON.stringify(error)}\n`;
  
  fs.appendFileSync(logFile, logEntry, "utf8");
}

// Run the refresh
refreshAccessToken();

