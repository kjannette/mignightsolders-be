/**
 * Update Instagram Configuration Helper
 * 
 * This script helps you update your secrets.js file with the new Instagram account
 * after you've created and connected @midnightsoldiers
 * 
 * Usage:
 * 1. Run this script to get your new Instagram Business Account ID
 * 2. Copy the generated secrets.js content
 * 3. Update your secrets.js file
 */

const readline = require('readline');

const FACEBOOK_API_VERSION = "v23.0";
const FACEBOOK_PAGE_ID = "862511466941111"; // Your Facebook Page ID

async function getInstagramBusinessAccountId(accessToken) {
  console.log("\nFetching Instagram Business Account ID...\n");
  
  try {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Error fetching Instagram account:", error);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.instagram_business_account) {
      console.error("No Instagram Business Account connected to this Facebook Page!");
      console.error("Please follow the instructions in CREATE_NEW_INSTAGRAM_ACCOUNT.md");
      return null;
    }
    
    const igAccount = data.instagram_business_account;
    
    console.log("Instagram Business Account Found!\n");
    console.log("════════════════════════════════════════");
    console.log("  Username:", igAccount.username || "N/A");
    console.log("  Name:", igAccount.name || "N/A");
    console.log("  ID:", igAccount.id);
    console.log("════════════════════════════════════════\n");
    
    return igAccount;
    
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

async function checkTokenPermissions(accessToken) {
  console.log("Checking token permissions...\n");
  
  try {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Error checking token:", error);
      return false;
    }
    
    const data = await response.json();
    const tokenData = data.data;
    
    if (!tokenData.is_valid) {
      console.error("Token is not valid!");
      return false;
    }
    
    const scopes = tokenData.scopes || [];
    const hasContentPublish = scopes.includes('instagram_content_publish');
    const hasInsights = scopes.includes('instagram_manage_insights') || scopes.includes('instagram_basic');
    
    console.log("Token Scopes:", scopes.join(', '), "\n");
    
    if (!hasContentPublish) {
      console.error("Missing required permission: instagram_content_publish");
      return false;
    }
    
    if (!hasInsights) {
      console.error("Missing required permission: instagram_basic or instagram_manage_insights");
      return false;
    }
    
    console.log("Token has all required Instagram permissions!\n");
    return true;
    
  } catch (error) {
    console.error("Error:", error.message);
    return false;
  }
}

function generateSecretsJsContent(igAccount, accessToken) {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  return `// Facebook App: midnightsol
const FACEBOOK_APP_ID = "1453446205748046";
const FACEBOOK_APP_SECRET = "b04fed741855317aee871475cb138383";
const FACEBOOK_APP_ACCESS_TOKEN =
  "1453446205748046|th9H1TEhz-gcfOT898lMItuXWwE";
const FACEBOOK_PAGE_ID = "862511466941111";
const FACEBOOK_PAGE_ACCESS_TOKEN =
  "${accessToken}"; // Long-lived token (60 days) - Generated: ${today}
const INSTAGRAM_BUSINESS_ACCOUNT_ID = "${igAccount.id}"; // @${igAccount.username || 'midnightsoldiers'}
const INSTAGRAM_ACCESS_TOKEN =
  "${accessToken}"; // Long-lived token (60 days) - Generated: ${today}

module.exports = {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  FACEBOOK_APP_ACCESS_TOKEN,
  FACEBOOK_PAGE_ID,
  FACEBOOK_PAGE_ACCESS_TOKEN,
  INSTAGRAM_BUSINESS_ACCOUNT_ID,
  INSTAGRAM_ACCESS_TOKEN,
};
`;
}

async function promptForToken() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Enter your Page Access Token (from generateLongLivedToken.js): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Instagram Configuration Updater for Midnight Soldiers");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  console.log("This script will help you update secrets.js with your new");
  console.log("Instagram Business Account information.\n");
  
  console.log("Prerequisites:");
  console.log("  1. You've created a new Instagram account (@midnightsoldiers)");
  console.log("  2. You've converted it to a Business account");
  console.log("  3. You've connected it to your Facebook Page");
  console.log("  4. You've generated a long-lived Page Access Token\n");
  
  console.log("If you haven't done these steps yet, please follow:");
  console.log("CREATE_NEW_INSTAGRAM_ACCOUNT.md\n");
  
  // Get access token from user
  const accessToken = await promptForToken();
  
  if (!accessToken || accessToken === '') {
    console.error("\nNo token provided. Exiting.\n");
    return;
  }
  
  console.log("\n");
  
  // Check token permissions
  const hasPermissions = await checkTokenPermissions(accessToken);
  
  if (!hasPermissions) {
    console.error("Token does not have required permissions.");
    console.error("Please generate a new token with these permissions:");
    console.error("  - pages_show_list");
    console.error("  - pages_read_engagement");
    console.error("  - pages_manage_posts");
    console.error("  - instagram_manage_insights");
    console.error("  - instagram_content_publish\n");
    return;
  }
  
  // Get Instagram Business Account ID
  const igAccount = await getInstagramBusinessAccountId(accessToken);
  
  if (!igAccount) {
    console.error("Could not fetch Instagram Business Account.");
    console.error("Make sure your Instagram account is connected to your Facebook Page.\n");
    return;
  }
  
  // Generate new secrets.js content
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SUCCESS! Here's your updated secrets.js content:");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  const newContent = generateSecretsJsContent(igAccount, accessToken);
  console.log(newContent);
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Next Steps:");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("1. Copy the content above");
  console.log("2. Replace the content of secrets.js with it");
  console.log("3. Save the file");
  console.log("4. Restart your backend server");
  console.log("5. Run: node checkTokenPermissions.js (to verify)");
  console.log("6. Test posting a reel!\n");
}

// Run the script
main();

