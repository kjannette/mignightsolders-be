// Facebook Reels API Service
// Based on: https://developers.facebook.com/docs/video-api/guides/reels-publishing/

// PLACEHOLDERS - TO BE REPLACED WITH ACTUAL VALUES
const FACEBOOK_PAGE_ID = "YOUR_PAGE_ID_PLACEHOLDER"; // Replace with actual Facebook Page ID
const FACEBOOK_PAGE_ACCESS_TOKEN = "YOUR_PAGE_ACCESS_TOKEN_PLACEHOLDER"; // Replace with actual Page access token
const FACEBOOK_API_VERSION = "v23.0";
const FACEBOOK_GRAPH_API_BASE = "https://graph.facebook.com";

/**
 * Step 1: Initialize an Upload Session
 *
 * Before you can publish a video to a Facebook Page, you must first upload it to the Meta servers.
 * This function initializes a video upload session to start the upload process.
 *
 * Required permissions:
 * - pages_show_list
 * - pages_read_engagement
 * - pages_manage_posts
 *
 * @param {Object} reelData - The reel data from frontend
 * @returns {Promise<Object>} - Returns video_id and upload_url
 */
async function initializeUploadSession(reelData) {
  try {
    console.log("Initializing Facebook Reels upload session...");
    console.log("Reel data received:", reelData);

    const url = `${FACEBOOK_GRAPH_API_BASE}/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/video_reels`;

    const requestBody = {
      upload_phase: "start",
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
    };

    console.log("Making request to:", url);
    console.log("Request body:", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Facebook API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Upload session initialized successfully:", result);

    // Expected response format:
    // {
    //   "video_id": "video-id",
    //   "upload_url": "https://rupload.facebook.com/video-upload/video-id"
    // }

    return result;
  } catch (error) {
    console.error("Error initializing Facebook upload session:", error);
    throw error;
  }
}

/**
 * Main function to post reel to Facebook
 * Currently implements Step 1 only
 *
 * @param {Object} reel - Reel data from frontend
 */
async function postReelToFacebook(reel) {
  console.log("postReelToFacebook was called");
  console.log("Received reel data:", reel);

  try {
    // Step 1: Initialize Upload Session
    const uploadSession = await initializeUploadSession(reel);
    console.log("Upload session created:", uploadSession);

    // TODO: Step 2 - Upload the video file
    // TODO: Step 3 - Publish the reel to Facebook Page

    return {
      success: true,
      step: 1,
      message: "Upload session initialized successfully",
      data: uploadSession,
    };
  } catch (error) {
    console.error("Error in postReelToFacebook:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  postReelToFacebook,
  initializeUploadSession,
};
