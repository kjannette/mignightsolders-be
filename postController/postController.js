const {
  postReelToFacebook,
  initializeUploadSession,
  uploadVideoFile,
  uploadVideoWithRetry,
  resumeInterruptedUpload,
  getUploadStatus,
  publishReel,
} = require("../postServices/facebookApiService.js");
const {
  postReelToInstagram,
} = require("../postServices/instagramApiService.js");
const {
  postVideoToTikTok,
} = require("../postServices/tikTokApiService.js");

class PostController {
  constructor() {
    // Production mode - no testing on initialization
    console.log("PostController initialized in production mode");
  }

  /**
   * Main method to handle reel posting to Facebook, Instagram, and TikTok
   * @param {Object} reelData - Reel data from frontend
   */
  async handleReelPost(reelData) {
    try {
      console.log("PostController: Starting reel post workflow to Facebook, Instagram, and TikTok...");

      // Post to all platforms in parallel
      const [facebookResult, instagramResult, tiktokResult] = await Promise.allSettled([
        postReelToFacebook(reelData),
        postReelToInstagram(reelData),
        postVideoToTikTok(reelData),
      ]);

      // Process results
      const results = {
        facebook: {
          success: facebookResult.status === "fulfilled",
          data: facebookResult.status === "fulfilled" ? facebookResult.value : null,
          error: facebookResult.status === "rejected" ? facebookResult.reason.message : null,
        },
        instagram: {
          success: instagramResult.status === "fulfilled",
          data: instagramResult.status === "fulfilled" ? instagramResult.value : null,
          error: instagramResult.status === "rejected" ? instagramResult.reason.message : null,
        },
        tiktok: {
          success: tiktokResult.status === "fulfilled",
          data: tiktokResult.status === "fulfilled" ? tiktokResult.value : null,
          error: tiktokResult.status === "rejected" ? tiktokResult.reason.message : null,
        },
      };

      console.log("Social media posting results:", results);

      // Return success if at least one platform succeeded
      const overallSuccess = results.facebook.success || results.instagram.success || results.tiktok.success;

      return {
        success: overallSuccess,
        message: overallSuccess
          ? "Reel posted to social media"
          : "Failed to post to any platform",
        results: results,
      };
    } catch (error) {
      console.error("============================================");
      console.error("PostController: Error in reel post workflow");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("============================================");

      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * Manual step-by-step workflow with conditional responses
   * @param {Object} reelData - Reel data from frontend
   */
  async handleManualWorkflow(reelData) {
    try {
      console.log("PostController: Starting manual step-by-step workflow...");

      // Step 1: Initialize Upload Session
      console.log(
        "PostController: Executing Step 1 - Initialize Upload Session"
      );
      const uploadSession = await initializeUploadSession(reelData);

      if (!uploadSession || !uploadSession.video_id) {
        throw new Error(
          "Failed to initialize upload session - no video_id received"
        );
      }

      console.log("PostController: Step 1 completed successfully");

      // Step 2: Check if we need to upload or resume
      console.log("PostController: Checking upload status before Step 2");
      const initialStatus = await getUploadStatus(uploadSession.video_id);

      let uploadResult;
      if (initialStatus.status && initialStatus.status.uploading_phase) {
        const uploadPhase = initialStatus.status.uploading_phase;

        if (uploadPhase.status === "complete") {
          console.log(
            "PostController: Upload already complete, skipping Step 2"
          );
          uploadResult = { success: true, skipped: true };
        } else if (
          uploadPhase.status === "in_progress" &&
          uploadPhase.bytes_transfered
        ) {
          console.log(
            "PostController: Resuming interrupted upload from byte",
            uploadPhase.bytes_transfered
          );
          const fileSizeInBytes = Math.round(reelData.reelSize * 1024 * 1024);
          uploadResult = await resumeInterruptedUpload(
            uploadSession.video_id,
            reelData.reelVideoUrl,
            fileSizeInBytes,
            uploadPhase.bytes_transfered
          );
        } else {
          console.log("PostController: Starting fresh upload");
          const fileSizeInBytes = Math.round(reelData.reelSize * 1024 * 1024);
          uploadResult = await uploadVideoFile(
            uploadSession.video_id,
            reelData.reelVideoUrl,
            fileSizeInBytes
          );
        }
      } else {
        console.log("PostController: No status info, starting fresh upload");
        const fileSizeInBytes = Math.round(reelData.reelSize * 1024 * 1024);
        uploadResult = await uploadVideoFile(
          uploadSession.video_id,
          reelData.reelVideoUrl,
          fileSizeInBytes
        );
      }

      console.log("PostController: Step 2 completed successfully");

      // Step 3: Publish the reel
      console.log("PostController: Executing Step 3 - Publish Reel");
      const publishResult = await publishReel(uploadSession.video_id, reelData);

      if (!publishResult || !publishResult.success) {
        throw new Error("Failed to publish reel to Facebook");
      }

      console.log("PostController: Step 3 completed successfully");

      return {
        success: true,
        workflow: "manual",
        steps: {
          step1: uploadSession,
          step2: uploadResult,
          step3: publishResult,
        },
      };
    } catch (error) {
      console.error("============================================");
      console.error("PostController: Manual workflow failed");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("============================================");
      return {
        success: false,
        workflow: "manual",
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * Handle reel post request from API endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleReelPostRequest(req, res) {
    try {
      const reelData = req.body;
      console.log("PostController: Received reel post request:", reelData);

      const result = await this.handleReelPost(reelData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: "Reel posted to Facebook successfully",
          data: result,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to post reel to Facebook",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("============================================");
      console.error("PostController: Error handling reel post request");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("============================================");
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

module.exports = new PostController();
