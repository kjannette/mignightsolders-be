const {
  postReelToFacebook,
  initializeUploadSession,
  uploadVideoFile,
  uploadVideoWithRetry,
  resumeInterruptedUpload,
  getUploadStatus,
  publishReel,
} = require("../postServices/facebookApiService.js");

class PostController {
  constructor() {
    // Production mode - no testing on initialization
    console.log("PostController initialized in production mode");
  }

  /**
   * Main method to handle reel posting with conditional logic
   * @param {Object} reelData - Reel data from frontend
   */
  async handleReelPost(reelData) {
    try {
      console.log("PostController: Starting reel post workflow...");

      // Option 1: Use the complete workflow (recommended for production)
      const result = await postReelToFacebook(reelData);
      console.log("Complete workflow result:", result);

      return result;
    } catch (error) {
      console.error("PostController: Error in reel post workflow:", error);

      // Option 2: Manual step-by-step with conditional logic
      return await this.handleManualWorkflow(reelData);
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
      console.error("PostController: Manual workflow failed:", error);
      return {
        success: false,
        workflow: "manual",
        error: error.message,
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
      console.error("PostController: Error handling reel post request:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = new PostController();
