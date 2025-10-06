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
 * Step 2: Upload the Video
 *
 * Upload the video file to Facebook using the upload_url from Step 1.
 * For hosted files (like Firebase Storage URLs), we use the file_url parameter.
 *
 * @param {string} videoId - The video ID from Step 1
 * @param {string} fileUrl - The URL of the hosted video file (Firebase Storage URL)
 * @param {number} fileSizeInBytes - The size of the video file in bytes
 * @returns {Promise<Object>} - Returns upload success status
 */
async function uploadVideoFile(videoId, fileUrl, fileSizeInBytes) {
  try {
    console.log("Uploading video file to Facebook...");
    console.log("Video ID:", videoId);
    console.log("File URL:", fileUrl);
    console.log("File size:", fileSizeInBytes, "bytes");

    const url = `https://rupload.facebook.com/video-upload/${FACEBOOK_API_VERSION}/${videoId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${FACEBOOK_PAGE_ACCESS_TOKEN}`,
        offset: "0",
        file_size: fileSizeInBytes.toString(),
        file_url: fileUrl,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Facebook upload error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Video uploaded successfully:", result);

    // Expected response: {"success": true}
    return result;
  } catch (error) {
    console.error("Error uploading video to Facebook:", error);
    throw error;
  }
}

/**
 * Resume an Interrupted Upload
 *
 * If the video upload is interrupted, it can be resumed using the bytes_transferred
 * value from the status response as the offset.
 *
 * @param {string} videoId - The video ID from Step 1
 * @param {string} fileUrl - The URL of the hosted video file
 * @param {number} fileSizeInBytes - The total size of the video file in bytes
 * @param {number} offset - The byte offset to resume from (from status.uploading_phase.bytes_transfered)
 * @returns {Promise<Object>} - Returns upload success status
 */
async function resumeInterruptedUpload(
  videoId,
  fileUrl,
  fileSizeInBytes,
  offset
) {
  try {
    console.log("Resuming interrupted upload...");
    console.log("Video ID:", videoId);
    console.log("File URL:", fileUrl);
    console.log("File size:", fileSizeInBytes, "bytes");
    console.log("Resume offset:", offset, "bytes");

    const url = `https://rupload.facebook.com/video-upload/${FACEBOOK_API_VERSION}/${videoId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${FACEBOOK_PAGE_ACCESS_TOKEN}`,
        offset: offset.toString(),
        file_size: fileSizeInBytes.toString(),
        file_url: fileUrl,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Facebook resume upload error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Resume upload completed:", result);

    return result;
  } catch (error) {
    console.error("Error resuming interrupted upload:", error);
    throw error;
  }
}

/**
 * Upload Video with Retry Logic
 *
 * Attempts to upload video and automatically retries if interrupted.
 *
 * @param {string} videoId - The video ID from Step 1
 * @param {string} fileUrl - The URL of the hosted video file
 * @param {number} fileSizeInBytes - The size of the video file in bytes
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Object>} - Returns upload success status
 */
async function uploadVideoWithRetry(
  videoId,
  fileUrl,
  fileSizeInBytes,
  maxRetries = 3
) {
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Upload attempt ${retryCount + 1}/${maxRetries + 1}`);

      if (retryCount === 0) {
        // First attempt - start from beginning
        return await uploadVideoFile(videoId, fileUrl, fileSizeInBytes);
      } else {
        // Retry attempt - check status and resume if needed
        console.log("Checking upload status before retry...");
        const status = await getUploadStatus(videoId);

        if (status.status && status.status.uploading_phase) {
          const uploadPhase = status.status.uploading_phase;

          if (
            uploadPhase.status === "in_progress" &&
            uploadPhase.bytes_transfered
          ) {
            // Resume from where it left off
            console.log(`Resuming from byte ${uploadPhase.bytes_transfered}`);
            return await resumeInterruptedUpload(
              videoId,
              fileUrl,
              fileSizeInBytes,
              uploadPhase.bytes_transfered
            );
          } else if (uploadPhase.status === "complete") {
            // Upload already completed
            console.log("Upload already completed");
            return { success: true, resumed: true };
          }
        }

        // If status doesn't indicate interruption, try regular upload
        return await uploadVideoFile(videoId, fileUrl, fileSizeInBytes);
      }
    } catch (error) {
      retryCount++;
      console.error(`Upload attempt ${retryCount} failed:`, error.message);

      if (retryCount > maxRetries) {
        console.error("Max retry attempts reached");
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Get Upload Status
 *
 * Check the status of a video upload to see processing, uploading, and publishing phases.
 *
 * @param {string} videoId - The video ID from Step 1
 * @returns {Promise<Object>} - Returns status information
 */
async function getUploadStatus(videoId) {
  try {
    console.log("Getting upload status for video:", videoId);

    const url = `${FACEBOOK_GRAPH_API_BASE}/${FACEBOOK_API_VERSION}/${videoId}?fields=status&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Facebook status error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Upload status retrieved:", result);

    return result;
  } catch (error) {
    console.error("Error getting upload status:", error);
    throw error;
  }
}

/**
 * Step 3: Publish the Reel
 *
 * End the upload session and publish the video as a reel on the Facebook Page.
 * Can include additional fields like description (with hashtags) and title.
 *
 * @param {string} videoId - The video ID from Step 1
 * @param {Object} reelData - Reel data including description, title, etc.
 * @returns {Promise<Object>} - Returns publish success status
 */
async function publishReel(videoId, reelData) {
  try {
    console.log("Publishing reel to Facebook Page...");
    console.log("Video ID:", videoId);
    console.log("Reel data for publishing:", reelData);

    const url = `${FACEBOOK_GRAPH_API_BASE}/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/video_reels`;

    // Prepare the request parameters
    const params = new URLSearchParams({
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      video_id: videoId,
      upload_phase: "finish",
      video_state: "PUBLISHED",
    });

    // Add description if provided (can include hashtags)
    if (reelData.reelDescription && reelData.reelDescription.trim()) {
      params.append("description", reelData.reelDescription);
    }

    // Add title if provided (using reelName as title)
    if (reelData.reelName && reelData.reelName.trim()) {
      params.append("title", reelData.reelName);
    }

    console.log("Publishing with parameters:", Object.fromEntries(params));

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Facebook publish error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Reel published successfully:", result);

    // Expected response: {"success": true}
    return result;
  } catch (error) {
    console.error("Error publishing reel to Facebook:", error);
    throw error;
  }
}

/**
 * Main function to post reel to Facebook
 * Implements complete workflow: Steps 1, 2, and 3
 *
 * @param {Object} reel - Reel data from frontend
 */
async function postReelToFacebook(reel) {
  console.log("postReelToFacebook was called");
  console.log("Received reel data:", reel);

  try {
    // Validate required data
    if (!reel.reelVideoUrl) {
      throw new Error("reelVideoUrl is required for Facebook upload");
    }
    if (!reel.reelSize) {
      throw new Error("reelSize is required for Facebook upload");
    }

    // Step 1: Initialize Upload Session
    const uploadSession = await initializeUploadSession(reel);
    console.log("Upload session created:", uploadSession);

    if (!uploadSession.video_id) {
      throw new Error("No video_id received from Facebook initialization");
    }

    // Step 2: Upload the Video File with Retry Logic
    console.log("Starting Step 2: Upload video file with retry logic...");
    const fileSizeInBytes = Math.round(reel.reelSize * 1024 * 1024); // Convert MB to bytes

    const uploadResult = await uploadVideoWithRetry(
      uploadSession.video_id,
      reel.reelVideoUrl,
      fileSizeInBytes,
      3 // Max 3 retry attempts
    );
    console.log("Video upload completed:", uploadResult);

    // Step 2.5: Final Status Check
    console.log("Performing final status check...");
    const finalStatus = await getUploadStatus(uploadSession.video_id);
    console.log("Final upload status:", finalStatus);

    // Step 3: Publish the Reel to Facebook Page
    console.log("Starting Step 3: Publish reel to Facebook Page...");
    const publishResult = await publishReel(uploadSession.video_id, reel);
    console.log("Reel published successfully:", publishResult);

    return {
      success: true,
      step: 3,
      message: "Reel uploaded and published successfully to Facebook",
      data: {
        uploadSession,
        uploadResult,
        finalStatus,
        publishResult,
      },
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
  uploadVideoFile,
  uploadVideoWithRetry,
  resumeInterruptedUpload,
  getUploadStatus,
  publishReel,
};
