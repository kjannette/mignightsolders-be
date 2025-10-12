// ============================================
// STEP 2: Exchange Authorization Code for Access Token
// ============================================
// This script exchanges the authorization code for an access token
// Usage: node 2-exchangeCodeForToken.js <AUTHORIZATION_CODE>

const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET } = require("../../secrets.js");
const fs = require("fs");
const path = require("path");

// Configuration
const REDIRECT_URI = "http://localhost:3000/auth/tiktok/callback"; // Must match the one used in Step 1

async function exchangeCodeForToken(authorizationCode) {
  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    console.error("❌ Error: TikTok credentials are not set in secrets.js");
    process.exit(1);
  }

  if (!authorizationCode) {
    console.error("❌ Error: Please provide the authorization code");
    console.error("Usage: node 2-exchangeCodeForToken.js <AUTHORIZATION_CODE>");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🔄 EXCHANGING AUTHORIZATION CODE FOR ACCESS TOKEN");
  console.log("=".repeat(80) + "\n");

  const url = "https://open.tiktokapis.com/v2/oauth/token/";
  
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    client_secret: TIKTOK_CLIENT_SECRET,
    code: decodeURIComponent(authorizationCode),
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
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
      process.exit(1);
    }

    console.log("✅ SUCCESS! Tokens received:\n");
    console.log("📋 Response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("\n" + "=".repeat(80));
    console.log("🎉 TOKEN DETAILS");
    console.log("=".repeat(80));
    console.log("🔑 Access Token:", data.access_token);
    console.log("🔄 Refresh Token:", data.refresh_token);
    console.log("👤 Open ID:", data.open_id);
    console.log("⏰ Expires In:", data.expires_in, "seconds (24 hours)");
    console.log("🔐 Scopes:", data.scope);
    console.log("=".repeat(80) + "\n");

    // Update secrets.js file
    updateSecretsFile(data.access_token, data.refresh_token);

  } catch (error) {
    console.error("❌ Error exchanging code for token:");
    console.error(error);
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
    console.log("\n⚠️  IMPORTANT: Set up the token refresh cron job (see Step 3)");
    console.log("    Access token expires in 24 hours!\n");
  } catch (error) {
    console.error("❌ Error updating secrets.js:");
    console.error(error);
    console.log("\n⚠️  Please manually update secrets.js with these values:");
    console.log(`TIKTOK_ACCESS_TOKEN = "${accessToken}";`);
    console.log(`TIKTOK_REFRESH_TOKEN = "${refreshToken}";`);
  }
}

// Get authorization code from command line arguments
const authorizationCode = process.argv[2];
exchangeCodeForToken(authorizationCode);

