// Instagram Reels API Service
// Based on: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

import {
  INSTAGRAM_BUSINESS_ACCOUNT_ID,
  INSTAGRAM_ACCESS_TOKEN,
} from "../secrets.js";
const INSTAGRAM_API_VERSION = "v23.0";
const FACEBOOK_GRAPH_API_BASE = "https://graph.facebook.com";

/**
 * Step 1: Create Media Container for Reels
 *
 * Create a media container for Instagram Reels. This prepares the video for upload.
 * Instagram Reels require specific video specifications and the media must be publicly accessible.
 *
 * Required permissions:
 * - instagram_basic
 * - instagram_content_publish
 * - pages_show_list
 * - pages_read_engagement
 *
 * @param {Object} reelData - The reel data from frontend
 * @returns {Promise<Object>} - Returns creation_id for the media container
 */
async function createReelsMediaContainer(reelData) {
  try {
    console.log("Creating Instagram Reels media container...");
    console.log("Reel data received:", reelData);

    const url = `${FACEBOOK_GRAPH_API_BASE}/${INSTAGRAM_API_VERSION}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`;

    const requestBody = {
      media_type: "REELS",
      video_url: reelData.reelVideoUrl,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    };

    // Add caption if provided (can include hashtags and mentions)
    if (reelData.reelDescription && reelData.reelDescription.trim()) {
      requestBody.caption = reelData.reelDescription;
    }

    // Add cover_url if provided (thumbnail for the reel)
    if (reelData.reelThumbnailUrl && reelData.reelThumbnailUrl.trim()) {
      requestBody.cover_url = reelData.reelThumbnailUrl;
    }

    // Add location_id if provided
    if (reelData.locationId) {
      requestBody.location_id = reelData.locationId;
    }

    // Add user_tags if provided
    if (
      reelData.userTags &&
      Array.isArray(reelData.userTags) &&
      reelData.userTags.length > 0
    ) {
      requestBody.user_tags = JSON.stringify(reelData.userTags);
    }

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
      const errorText = await response.text();
      throw new Error(
        `Instagram API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Media container created successfully:", result);

    // Expected response format:
    // {
    //   "id": "media-container-id"
    // }

    return result;
  } catch (error) {
    console.error("Error creating Instagram media container:", error);
    throw error;
  }
}

/**
 * Step 2: Check Media Container Status
 *
 * Check the status of the media container to ensure it's ready for publishing.
 * The container status should be "FINISHED" before attempting to publish.
 *
 * @param {string} creationId - The creation ID from Step 1
 * @returns {Promise<Object>} - Returns status information
 */
async function getMediaContainerStatus(creationId) {
  try {
    console.log("Checking media container status for:", creationId);

    const url = `${FACEBOOK_GRAPH_API_BASE}/${INSTAGRAM_API_VERSION}/${creationId}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Instagram status error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Media container status retrieved:", result);

    // Expected response format:
    // {
    //   "status_code": "FINISHED" | "IN_PROGRESS" | "ERROR",
    //   "status": "Additional status information",
    //   "id": "creation-id"
    // }

    return result;
  } catch (error) {
    console.error("Error getting media container status:", error);
    throw error;
  }
}

/**
 * Wait for Media Container to be Ready
 *
 * Polls the media container status until it's ready for publishing or times out.
 *
 * @param {string} creationId - The creation ID from Step 1
 * @param {number} maxWaitTime - Maximum wait time in milliseconds (default: 5 minutes)
 * @param {number} pollInterval - Polling interval in milliseconds (default: 10 seconds)
 * @returns {Promise<Object>} - Returns final status when ready
 */
async function waitForMediaContainerReady(
  creationId,
  maxWaitTime = 5 * 60 * 1000, // 5 minutes
  pollInterval = 10 * 1000 // 10 seconds
) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await getMediaContainerStatus(creationId);

      if (status.status_code === "FINISHED") {
        console.log("Media container is ready for publishing");
        return status;
      } else if (status.status_code === "ERROR") {
        throw new Error(
          `Media container processing failed: ${
            status.status || "Unknown error"
          }`
        );
      } else if (status.status_code === "IN_PROGRESS") {
        console.log("Media container still processing, waiting...");
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } else {
        console.log(
          `Unknown status: ${status.status_code}, continuing to wait...`
        );
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error("Error while waiting for media container:", error);
      throw error;
    }
  }

  throw new Error("Timeout waiting for media container to be ready");
}

/**
 * Step 3: Publish Media Container
 *
 * Publish the media container as an Instagram Reel to the business account.
 *
 * @param {string} creationId - The creation ID from Step 1
 * @returns {Promise<Object>} - Returns publish success status and media ID
 */
async function publishMediaContainer(creationId) {
  try {
    console.log("Publishing media container to Instagram...");
    console.log("Creation ID:", creationId);

    const url = `${FACEBOOK_GRAPH_API_BASE}/${INSTAGRAM_API_VERSION}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`;

    const requestBody = {
      creation_id: creationId,
      access_token: INSTAGRAM_ACCESS_TOKEN,
    };

    console.log("Making publish request to:", url);
    console.log("Request body:", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Instagram publish error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Reel published successfully to Instagram:", result);

    // Expected response format:
    // {
    //   "id": "published-media-id"
    // }

    return result;
  } catch (error) {
    console.error("Error publishing reel to Instagram:", error);
    throw error;
  }
}

/**
 * Get Published Media Information
 *
 * Retrieve information about the published Instagram media.
 *
 * @param {string} mediaId - The media ID from the publish response
 * @returns {Promise<Object>} - Returns media information
 */
async function getPublishedMediaInfo(mediaId) {
  try {
    console.log("Getting published media info for:", mediaId);

    const fields =
      "id,media_type,media_url,permalink,thumbnail_url,timestamp,caption,like_count,comments_count";
    const url = `${FACEBOOK_GRAPH_API_BASE}/${INSTAGRAM_API_VERSION}/${mediaId}?fields=${fields}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Instagram media info error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Published media info retrieved:", result);

    return result;
  } catch (error) {
    console.error("Error getting published media info:", error);
    throw error;
  }
}

/**
 * Validate Reel Requirements
 *
 * Validate that the reel data meets Instagram's requirements for Reels.
 *
 * @param {Object} reelData - The reel data to validate
 * @returns {Object} - Validation result
 */
function validateReelRequirements(reelData) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!reelData.reelVideoUrl) {
    errors.push("reelVideoUrl is required for Instagram upload");
  }

  // Video URL should be publicly accessible
  if (reelData.reelVideoUrl && !reelData.reelVideoUrl.startsWith("http")) {
    errors.push("reelVideoUrl must be a publicly accessible HTTP/HTTPS URL");
  }

  // Caption length (Instagram allows up to 2,200 characters)
  if (reelData.reelDescription && reelData.reelDescription.length > 2200) {
    warnings.push("Caption exceeds 2,200 characters and may be truncated");
  }

  // Video duration recommendations (Instagram Reels: 15 seconds to 90 seconds)
  if (reelData.reelDuration) {
    if (reelData.reelDuration < 15) {
      warnings.push(
        "Video duration is less than 15 seconds (recommended minimum)"
      );
    }
    if (reelData.reelDuration > 90) {
      warnings.push("Video duration exceeds 90 seconds (recommended maximum)");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Main function to post reel to Instagram
 * Implements complete workflow: Steps 1, 2, and 3
 *
 * @param {Object} reel - Reel data from frontend
 */
async function postReelToInstagram(reel) {
  console.log("postReelToInstagram was called");
  console.log("Received reel data:", reel);

  try {
    // Validate reel requirements
    const validation = validateReelRequirements(reel);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn("Validation warnings:", validation.warnings);
    }

    // Step 1: Create Media Container
    console.log("Starting Step 1: Create media container...");
    const mediaContainer = await createReelsMediaContainer(reel);
    console.log("Media container created:", mediaContainer);

    if (!mediaContainer.id) {
      throw new Error(
        "No creation_id received from Instagram media container creation"
      );
    }

    // Step 2: Wait for Media Container to be Ready
    console.log("Starting Step 2: Wait for media container to be ready...");
    const readyStatus = await waitForMediaContainerReady(mediaContainer.id);
    console.log("Media container is ready:", readyStatus);

    // Step 3: Publish the Media Container
    console.log("Starting Step 3: Publish media container...");
    const publishResult = await publishMediaContainer(mediaContainer.id);
    console.log("Reel published successfully:", publishResult);

    // Step 4: Get Published Media Information (optional)
    let mediaInfo = null;
    if (publishResult.id) {
      try {
        console.log("Getting published media information...");
        mediaInfo = await getPublishedMediaInfo(publishResult.id);
        console.log("Published media info:", mediaInfo);
      } catch (error) {
        console.warn("Could not retrieve published media info:", error.message);
      }
    }

    return {
      success: true,
      step: 3,
      message: "Reel uploaded and published successfully to Instagram",
      data: {
        mediaContainer,
        readyStatus,
        publishResult,
        mediaInfo,
      },
    };
  } catch (error) {
    console.error("Error in postReelToInstagram:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  postReelToInstagram,
  createReelsMediaContainer,
  getMediaContainerStatus,
  waitForMediaContainerReady,
  publishMediaContainer,
  getPublishedMediaInfo,
  validateReelRequirements,
};
