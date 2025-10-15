// TikTok API Service
// Based on: https://developers.tiktok.com/doc/content-posting-api-reference/
// Implements Push by File approach for direct file uploads

const { TIKTOK_ACCESS_TOKEN } = require("../secrets.js");
const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const TIKTOK_API_VERSION = "v2";
const fs = require('fs');
const path = require('path');

/**
 * Utility function to validate and normalize file paths
 * @param {string} filePath - The file path to validate
 * @returns {string} - Normalized absolute file path
 */
function validateAndNormalizeFilePath(filePath) {
  if (!filePath) {
    throw new Error("File path is required");
  }

  // Convert to absolute path if relative
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

  // Security check - ensure path is within allowed directories
  const allowedDirs = ['/tmp', process.cwd(), path.join(process.cwd(), 'video_files')];
  const isInAllowedDir = allowedDirs.some(allowedDir =>
    absolutePath.startsWith(allowedDir)
  );

  if (!isInAllowedDir) {
    throw new Error(`File path not allowed: ${absolutePath}`);
  }

  return absolutePath;
}

/**
 * Enhanced error handler for TikTok API operations
 * @param {Error} error - The error that occurred
 * @param {string} operation - The operation that failed
 * @param {Object} context - Additional context for debugging
 */
function handleTikTokError(error, operation, context = {}) {
  console.error(`TikTok API Error in ${operation}:`, {
    message: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString()
  });

  // Return structured error for upstream handling
  return {
    success: false,
    error: error.message,
    operation: operation,
    context: context,
    timestamp: new Date().toISOString()
  };
}

/**
 * Step 1: Initialize Video Upload
 *
 * Initialize a video upload session to TikTok. This creates an upload URL
 * and returns a publish_id that will be used for publishing.
 *
 * Required scopes:
 * - video.upload
 * - video.publish
 *
 * @param {Object} videoData - The video data from frontend
 * @returns {Promise<Object>} - Returns publish_id and upload_url
 */
async function initializeVideoUpload(videoData) {
  try {
    console.log("Initializing TikTok video upload...");
    console.log("Video data received:", videoData);

    const url = `${TIKTOK_API_BASE}/${TIKTOK_API_VERSION}/post/publish/video/init/`;

    // TikTok requires Content-Type to be specified
    const requestBody = {
      post_info: {
        title: videoData.reelName || "",
        privacy_level: videoData.privacyLevel || "SELF_ONLY", // PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, SELF_ONLY
        disable_duet: videoData.disableDuet || false,
        disable_comment: videoData.disableComment || false,
        disable_stitch: videoData.disableStitch || false,
        video_cover_timestamp_ms: videoData.coverTimestamp || 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: Math.round(videoData.reelSize * 1024 * 1024), // Convert MB to bytes
        chunk_size: Math.round(videoData.reelSize * 1024 * 1024), // For single chunk upload
        total_chunk_count: 1,
      },
    };

    console.log("Making request to:", url);
    console.log("Request body:", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("TikTok API error response:", errorBody);
      throw new Error(
        `TikTok API error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const result = await response.json();
    console.log("Upload session initialized successfully:", result);

    // Expected response format:
    // {
    //   "data": {
    //     "publish_id": "publish-id-string",
    //     "upload_url": "https://open-upload.tiktokapis.com/video/"
    //   },
    //   "error": {
    //     "code": "ok",
    //     "message": "",
    //     "log_id": "log-id-string"
    //   }
    // }

    if (result.error && result.error.code !== "ok") {
      throw new Error(
        `TikTok initialization error: ${result.error.message || result.error.code}`
      );
    }

    return result.data;
  } catch (error) {
    console.error("Error initializing TikTok upload:", error);
    throw error;
  }
}

/**
 * Step 2: Upload Video to TikTok (Push by File Implementation)
 *
 * Upload the actual video file to TikTok using the upload_url from Step 1.
 * Reads directly from filesystem using streaming for memory efficiency.
 *
 * @param {string} uploadUrl - The upload URL from Step 1
 * @param {string} filePath - The local filesystem path to the video file
 * @param {number} fileSizeInBytes - The size of the video file in bytes
 * @returns {Promise<Object>} - Returns upload success status
 */
async function uploadVideoFile(uploadUrl, filePath, fileSizeInBytes) {
  try {
    console.log("🚀 Starting TikTok push_by_file upload...");
    console.log("Upload URL:", uploadUrl);
    console.log("File path:", filePath);
    console.log("File size:", fileSizeInBytes, "bytes");

    // Validate and normalize file path
    const normalizedPath = validateAndNormalizeFilePath(filePath);

    // Validate file exists and is readable
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Video file not found at path: ${normalizedPath}`);
    }

    const stats = fs.statSync(normalizedPath);
    const actualFileSize = stats.size;

    if (actualFileSize !== fileSizeInBytes) {
      console.warn(`⚠️  File size mismatch. Expected: ${fileSizeInBytes}, Actual: ${actualFileSize}`);
    }

    // Determine if we need chunked upload (TikTok supports up to 64MB per chunk)
    const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
    const shouldChunk = actualFileSize > CHUNK_SIZE;

    if (shouldChunk) {
      console.log(`📦 Large file detected (${Math.round(actualFileSize / (1024 * 1024))}MB). Using chunked upload.`);
      return await uploadVideoFileChunked(uploadUrl, normalizedPath, actualFileSize);
    } else {
      console.log("📄 Using single-chunk upload for smaller file.");
      return await uploadVideoFileSingle(uploadUrl, normalizedPath, actualFileSize);
    }

  } catch (error) {
    return handleTikTokError(error, 'uploadVideoFile', {
      uploadUrl,
      filePath,
      fileSizeInBytes
    });
  }
}

/**
 * Upload video file in a single request (for files under 64MB)
 */
async function uploadVideoFileSingle(uploadUrl, filePath, fileSizeInBytes) {
  try {
    const fs = require('fs');

    console.log("Reading entire file for single-chunk upload...");
    const fileBuffer = fs.readFileSync(filePath);

    console.log("File read complete, uploading to TikTok...");

    // Upload to TikTok
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
        "Content-Type": "video/mp4",
        "Content-Length": fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("TikTok single-chunk upload error response:", errorBody);
      throw new Error(
        `TikTok upload error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    console.log("✅ Video uploaded successfully to TikTok (single chunk)");
    return { success: true, method: "single_chunk" };
  } catch (error) {
    return handleTikTokError(error, 'uploadVideoFileSingle', {
      uploadUrl,
      filePath,
      fileSizeInBytes
    });
  }
}

/**
 * Upload video file in chunks (for files over 64MB)
 */
async function uploadVideoFileChunked(uploadUrl, filePath, fileSizeInBytes) {
  try {
    const fs = require('fs');
    const path = require('path');

    console.log("Starting chunked upload for large file...");

    const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
    const totalChunks = Math.ceil(fileSizeInBytes / CHUNK_SIZE);

    console.log(`File will be uploaded in ${totalChunks} chunks of ${CHUNK_SIZE} bytes each`);

    let uploadedBytes = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startByte = chunkIndex * CHUNK_SIZE;
      const endByte = Math.min(startByte + CHUNK_SIZE, fileSizeInBytes);
      const chunkSize = endByte - startByte;

      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${Math.round(chunkSize / (1024 * 1024))}MB)`);

      // Read specific chunk from file
      const chunkBuffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(filePath, 'r');

      try {
        fs.readSync(fd, chunkBuffer, 0, chunkSize, startByte);

        // Upload chunk to TikTok
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
            "Content-Type": "video/mp4",
            "Content-Length": chunkSize.toString(),
            "Content-Range": `bytes ${startByte}-${endByte - 1}/${fileSizeInBytes}`,
          },
          body: chunkBuffer,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`TikTok chunk ${chunkIndex + 1} upload error:`, errorBody);
          throw new Error(
            `TikTok chunk upload error: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }

        uploadedBytes += chunkSize;
        const progress = Math.round((uploadedBytes / fileSizeInBytes) * 100);
        console.log(`Chunk ${chunkIndex + 1} uploaded successfully. Progress: ${progress}%`);

      } finally {
        fs.closeSync(fd);
      }
    }

    console.log("✅ All chunks uploaded successfully to TikTok");
    return { success: true, method: "chunked", chunks: totalChunks };
  } catch (error) {
    return handleTikTokError(error, 'uploadVideoFileChunked', {
      uploadUrl,
      filePath,
      fileSizeInBytes,
      totalChunks
    });
  }
}

/**
 * Step 3: Publish Video to TikTok
 *
 * Finalize and publish the video to TikTok using the publish_id from Step 1.
 *
 * @param {string} publishId - The publish ID from Step 1
 * @param {Object} videoData - Video data including caption, hashtags, etc.
 * @returns {Promise<Object>} - Returns publish status
 */
async function publishVideo(publishId, videoData) {
  try {
    console.log("Publishing video to TikTok...");
    console.log("Publish ID:", publishId);

    const url = `${TIKTOK_API_BASE}/${TIKTOK_API_VERSION}/post/publish/status/fetch/`;

    const requestBody = {
      publish_id: publishId,
    };

    console.log("Making publish status request to:", url);
    console.log("Request body:", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("TikTok publish error response:", errorBody);
      throw new Error(
        `TikTok publish error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const result = await response.json();
    console.log("Publish status response:", result);

    // Expected response format:
    // {
    //   "data": {
    //     "status": "PUBLISH_COMPLETE", // or PROCESSING_UPLOAD, SEND_TO_USER_INBOX, etc.
    //     "publicaly_available_post_id": ["post-id"] (only if published)
    //   },
    //   "error": {
    //     "code": "ok",
    //     "message": ""
    //   }
    // }

    if (result.error && result.error.code !== "ok") {
      throw new Error(
        `TikTok publish error: ${result.error.message || result.error.code}`
      );
    }

    return result.data;
  } catch (error) {
    console.error("Error publishing video to TikTok:", error);
    throw error;
  }
}

/**
 * Wait for Video to be Published
 *
 * Polls the publish status until the video is published or times out.
 *
 * @param {string} publishId - The publish ID from Step 1
 * @param {number} maxWaitTime - Maximum wait time in milliseconds (default: 5 minutes)
 * @param {number} pollInterval - Polling interval in milliseconds (default: 10 seconds)
 * @returns {Promise<Object>} - Returns final status when published
 */
async function waitForPublishComplete(
  publishId,
  maxWaitTime = 5 * 60 * 1000, // 5 minutes
  pollInterval = 10 * 1000 // 10 seconds
) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await publishVideo(publishId, {});

      console.log("Current publish status:", status.status);

      if (status.status === "PUBLISH_COMPLETE") {
        console.log("Video published successfully to TikTok!");
        return status;
      } else if (status.status === "FAILED") {
        throw new Error(
          `Video publishing failed: ${status.fail_reason || "Unknown error"}`
        );
      } else if (
        status.status === "PROCESSING_UPLOAD" ||
        status.status === "PROCESSING_DOWNLOAD" ||
        status.status === "SEND_TO_USER_INBOX"
      ) {
        console.log(
          `Video still processing (${status.status}), waiting...`
        );
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } else {
        console.log(
          `Unknown status: ${status.status}, continuing to wait...`
        );
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error("Error while waiting for publish:", error);
      throw error;
    }
  }

  throw new Error("Timeout waiting for video to be published");
}

/**
 * Validate Video Requirements for Push by File
 *
 * Validate that the video data meets TikTok's requirements for push_by_file uploads.
 *
 * @param {Object} videoData - The video data to validate (expects filePath instead of reelVideoUrl)
 * @returns {Object} - Validation result
 */
function validateVideoRequirements(videoData) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!videoData.filePath) {
    errors.push("filePath is required for TikTok push_by_file upload");
  }

  if (!videoData.reelSize) {
    errors.push("reelSize is required for TikTok upload");
  }

  // Validate file path exists and is readable (for push_by_file)
  if (videoData.filePath) {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(videoData.filePath)) {
      errors.push(`Video file not found at path: ${videoData.filePath}`);
    } else {
      // Check if file is readable
      try {
        fs.accessSync(videoData.filePath, fs.constants.R_OK);
      } catch (error) {
        errors.push(`Video file is not readable at path: ${videoData.filePath}`);
      }

      // Get actual file size for validation
      try {
        const stats = fs.statSync(videoData.filePath);
        const actualSizeMB = stats.size / (1024 * 1024);

        // File size limits (TikTok: max 4GB for API uploads)
        if (actualSizeMB > 4096) {
          errors.push(`Video file size (${Math.round(actualSizeMB)}MB) exceeds TikTok's 4GB limit`);
        }

        // Warn if file size is very large
        if (actualSizeMB > 100) {
          warnings.push(`Large file detected (${Math.round(actualSizeMB)}MB). Upload may take longer.`);
        }
      } catch (error) {
        errors.push(`Cannot get file stats for: ${videoData.filePath}`);
      }
    }
  }

  // File size limits (TikTok: max 4GB for API uploads)
  if (videoData.reelSize && videoData.reelSize > 4096) {
    errors.push("Video file size exceeds 4GB limit");
  }

  // Video duration (TikTok: 3 seconds to 10 minutes)
  if (videoData.reelDuration) {
    if (videoData.reelDuration < 3) {
      errors.push("Video duration must be at least 3 seconds");
    }
    if (videoData.reelDuration > 600) {
      errors.push("Video duration exceeds 10 minute maximum");
    }
  }

  // Title length (TikTok allows up to 150 characters)
  if (videoData.reelName && videoData.reelName.length > 150) {
    warnings.push("Title exceeds 150 characters and may be truncated");
  }

  // Caption length (TikTok allows up to 2,200 characters including hashtags)
  if (videoData.reelDescription && videoData.reelDescription.length > 2200) {
    warnings.push("Description exceeds 2,200 characters and may be truncated");
  }

  // Video aspect ratio recommendations
  if (videoData.aspectRatio) {
    const validRatios = ["9:16", "1:1", "16:9"];
    if (!validRatios.includes(videoData.aspectRatio)) {
      warnings.push(
        `Aspect ratio ${videoData.aspectRatio} may not display optimally. Recommended: 9:16 (vertical), 1:1 (square), or 16:9 (horizontal)`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get Video Information
 *
 * Retrieve information about a published TikTok video.
 *
 * @param {string} videoId - The video ID from the publish response
 * @returns {Promise<Object>} - Returns video information
 */
async function getVideoInfo(videoId) {
  try {
    console.log("Getting video info for:", videoId);

    const url = `${TIKTOK_API_BASE}/${TIKTOK_API_VERSION}/video/query/`;

    const requestBody = {
      filters: {
        video_ids: [videoId],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("TikTok video info error response:", errorBody);
      throw new Error(
        `TikTok video info error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const result = await response.json();
    console.log("Video info retrieved:", result);

    return result.data;
  } catch (error) {
    console.error("Error getting video info:", error);
    throw error;
  }
}

/**
 * Main function to post video to TikTok
 * Implements complete workflow: Steps 1, 2, and 3
 *
 * @param {Object} videoData - Video data from frontend
 */
async function postVideoToTikTok(videoData) {
  console.log("🎬 Starting TikTok push_by_file upload process...");
  console.log("📋 Received video data:", {
    filePath: videoData.filePath,
    reelSize: videoData.reelSize,
    reelName: videoData.reelName,
    hasAccessToken: !!TIKTOK_ACCESS_TOKEN
  });

  try {
    // Step 0: Pre-flight validation
    console.log("🔍 Running pre-flight validation...");
    const validation = validateVideoRequirements(videoData);
    if (!validation.isValid) {
      throw new Error(`❌ Validation failed: ${validation.errors.join(", ")}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn("⚠️  Validation warnings:", validation.warnings);
    }
    console.log("✅ Pre-flight validation passed");

    // Step 1: Initialize Video Upload
    console.log("🚀 Starting Step 1: Initialize video upload...");
    const initResult = await initializeVideoUpload(videoData);
    console.log("📋 Upload session initialized:", initResult);

    if (!initResult.publish_id || !initResult.upload_url) {
      throw new Error(
        "❌ No publish_id or upload_url received from TikTok initialization"
      );
    }

    // Step 2: Upload the Video File (Push by File)
    console.log("📤 Starting Step 2: Upload video file via push_by_file...");
    const fileSizeInBytes = Math.round(videoData.reelSize * 1024 * 1024);

    const uploadResult = await uploadVideoFile(
      initResult.upload_url,
      videoData.filePath,
      fileSizeInBytes
    );
    console.log("📤 Video upload completed:", uploadResult);

    // Step 3: Wait for Video to be Published
    console.log("⏳ Starting Step 3: Wait for video to be published...");
    const publishResult = await waitForPublishComplete(initResult.publish_id);
    console.log("🎉 Video published successfully:", publishResult);

    // Step 4: Get Published Video Information (optional)
    let videoInfo = null;
    if (
      publishResult.publicaly_available_post_id &&
      publishResult.publicaly_available_post_id.length > 0
    ) {
      try {
        console.log("Getting published video information...");
        videoInfo = await getVideoInfo(
          publishResult.publicaly_available_post_id[0]
        );
        console.log("Published video info:", videoInfo);
      } catch (error) {
        console.warn("Could not retrieve published video info:", error.message);
      }
    }

    return {
      success: true,
      step: 3,
      message: "Video uploaded and published successfully to TikTok",
      data: {
        initResult,
        uploadResult,
        publishResult,
        videoInfo,
      },
    };
  } catch (error) {
    console.error("💥 CRITICAL ERROR in TikTok push_by_file upload process:");
    console.error("❌ Error message:", error.message);
    console.error("🔍 Error stack:", error.stack);
    console.error("📋 Video data that caused error:", JSON.stringify(videoData, null, 2));
    console.error("🕒 Timestamp:", new Date().toISOString());
    console.error("🔚 END OF ERROR REPORT =========================================");

    return {
      success: false,
      error: error.message,
      stack: error.stack,
      operation: 'postVideoToTikTok',
      timestamp: new Date().toISOString(),
      videoData: videoData
    };
  }
}

module.exports = {
  postVideoToTikTok,
  initializeVideoUpload,
  uploadVideoFile,
  uploadVideoFileSingle,
  uploadVideoFileChunked,
  publishVideo,
  waitForPublishComplete,
  getVideoInfo,
  validateVideoRequirements,
};

