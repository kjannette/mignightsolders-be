// Automated Poster
// Handles automated posting of videos from the queue

const videoQueueManager = require("./videoQueueManager");
const postController = require("../postController/postController");
const config = require("../config/schedulerConfig");

class AutomatedPoster {
  constructor() {
    this.isPosting = false;
    console.log("AutomatedPoster initialized");
  }

  /**
   * Check for scheduled videos and post them
   * This is the main method called by the scheduler
   * @returns {Promise<Object>} - Result of the posting operation
   */
  async checkAndPost() {
    // Prevent concurrent posting operations
    if (this.isPosting) {
      console.log("[AUTOPOSTER] Already posting, skipping this cycle");
      return {
        success: false,
        message: "Posting already in progress",
      };
    }

    try {
      this.isPosting = true;

      if (config.logging.verbose) {
        console.log("[AUTOPOSTER] Checking for scheduled videos...");
      }

      // Get next scheduled video
      const nextVideo = await videoQueueManager.getNextVideo();

      if (!nextVideo) {
        if (config.logging.verbose) {
          console.log("[AUTOPOSTER] No videos scheduled for posting");
        }
        return {
          success: true,
          message: "No videos to post",
        };
      }

      console.log(
        `[AUTOPOSTER] Found video to post: "${nextVideo.videoName}" (ID: ${nextVideo.videoId})`
      );

      // Post the video
      const result = await this.postScheduledVideo(nextVideo);

      return result;
    } catch (error) {
      console.error("[AUTOPOSTER] Error in checkAndPost:", error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.isPosting = false;
    }
  }

  /**
   * Post a scheduled video to social media platforms
   * @param {Object} videoData - Video data from queue
   * @returns {Promise<Object>} - Result of posting
   */
  async postScheduledVideo(videoData) {
    const { id: docId, videoId, videoName, videoUrl } = videoData;

    try {
      console.log(
        `[AUTOPOSTER] Starting post for video: ${videoName} (${videoId})`
      );

      // Mark as posting in queue
      await videoQueueManager.markAsPosting(docId);

      // Prepare reel data for posting
      const reelData = {
        reelVideoUrl: videoData.videoUrl,
        reelSize: videoData.videoSize,
        reelName: videoData.videoName,
        reelDescription: videoData.videoDescription,
      };

      console.log("[AUTOPOSTER] Posting to social media platforms...");

      // Use existing postController to post to all platforms
      const postResult = await postController.handleReelPost(reelData);

      // Handle the result
      if (postResult.success) {
        await this.handlePostSuccess(docId, videoId, videoName, postResult);
        return {
          success: true,
          videoId,
          videoName,
          results: postResult.results,
        };
      } else {
        await this.handlePostFailure(
          docId,
          videoId,
          videoName,
          videoData.retryCount || 0,
          postResult.error || "Unknown error"
        );
        return {
          success: false,
          videoId,
          videoName,
          error: postResult.error,
        };
      }
    } catch (error) {
      console.error(
        `[AUTOPOSTER] Error posting video ${videoId}:`,
        error.message
      );
      await this.handlePostFailure(
        docId,
        videoId,
        videoName,
        videoData.retryCount || 0,
        error.message
      );
      return {
        success: false,
        videoId,
        videoName,
        error: error.message,
      };
    }
  }

  /**
   * Handle successful post
   * @param {string} docId - Firestore document ID
   * @param {string} videoId - Video ID
   * @param {string} videoName - Video name
   * @param {Object} postResult - Result from postController
   */
  async handlePostSuccess(docId, videoId, videoName, postResult) {
    try {
      // Update queue status to "posted"
      await videoQueueManager.markAsPosted(docId, postResult.results);

      // Log success
      if (config.logging.logSuccess) {
        const successfulPlatforms = [];
        if (postResult.results.facebook?.success) successfulPlatforms.push("Facebook");
        if (postResult.results.instagram?.success) successfulPlatforms.push("Instagram");
        if (postResult.results.tiktok?.success) successfulPlatforms.push("TikTok");

        console.log(
          `✅ [AUTOPOSTER] Successfully posted "${videoName}" to: ${successfulPlatforms.join(", ")}`
        );
      }

      // Optionally archive or delete the video file
      if (config.storage.deleteAfterPost || config.storage.archiveFiles) {
        await this.handleVideoFile(docId, videoId);
      }
    } catch (error) {
      console.error("[AUTOPOSTER] Error in handlePostSuccess:", error);
    }
  }

  /**
   * Handle failed post
   * @param {string} docId - Firestore document ID
   * @param {string} videoId - Video ID
   * @param {string} videoName - Video name
   * @param {number} retryCount - Current retry count
   * @param {string} errorMessage - Error message
   */
  async handlePostFailure(docId, videoId, videoName, retryCount, errorMessage) {
    try {
      // Check if we should retry
      const shouldRetry =
        config.queue.retryFailedPosts &&
        retryCount < config.queue.maxRetries;

      if (shouldRetry) {
        // Increment retry count and reschedule
        await videoQueueManager.incrementRetryCount(docId, retryCount);

        console.log(
          `⚠️  [AUTOPOSTER] Failed to post "${videoName}" (attempt ${retryCount + 1}/${config.queue.maxRetries}). Will retry.`
        );
      } else {
        // Mark as failed permanently
        await videoQueueManager.markAsFailed(docId, errorMessage, retryCount);

        if (config.logging.logFailures) {
          console.error(
            `❌ [AUTOPOSTER] Failed to post "${videoName}" after ${retryCount} retries. Error: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      console.error("[AUTOPOSTER] Error in handlePostFailure:", error);
    }
  }

  /**
   * Handle video file after successful post (archive or delete)
   * @param {string} docId - Firestore document ID
   * @param {string} videoId - Video ID
   */
  async handleVideoFile(docId, videoId) {
    try {
      // TODO: Implement file archiving or deletion logic
      // This would involve moving or deleting files from video_queue/pending/
      
      if (config.logging.verbose) {
        console.log(
          `[AUTOPOSTER] Video file handling for ${videoId} (configured: delete=${config.storage.deleteAfterPost}, archive=${config.storage.archiveFiles})`
        );
      }
    } catch (error) {
      console.error("[AUTOPOSTER] Error handling video file:", error);
    }
  }

  /**
   * Manually trigger posting of the next scheduled video
   * @returns {Promise<Object>} - Result of posting
   */
  async postNext() {
    console.log("[AUTOPOSTER] Manually triggered posting of next video");
    return this.checkAndPost();
  }

  /**
   * Get status of the automated poster
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      isPosting: this.isPosting,
      config: {
        retryEnabled: config.queue.retryFailedPosts,
        maxRetries: config.queue.maxRetries,
        platforms: config.posting.platforms,
      },
    };
  }
}

module.exports = new AutomatedPoster();

