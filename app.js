const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
// Import API services
const { postReelToFacebook } = require("./postServices/facebookApiService.js");
const {
  postReelToInstagram,
} = require("./postServices/instagramApiService.js");
//const { db } = require("./firebase/firebase.js");

const { collection, query, where, getDocs } = require("firebase/firestore");
const port = 3200

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
/*
 *  POST store new reel data
 */

app.post("/v1/accept-reel-data/:reelId", function (req, res) {
  console.log("accept-reel-data was hit by frontend")
  const { reelId } = req.params;
  const data = req.body;
  try {
    //storeReelData(docId, data);
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~`data received by backed:  ", data);
  } catch (err) {
    console.log("Error at /v1/store-reel-data/:reelId:", err);
  }
  res.end();
});

/*
 *  POST test Facebook reel upload
 */
app.post("/test/facebook-reel", async function (req, res) {
  console.log("Testing Facebook reel upload...");
  const { videoFileName, reelName, reelDescription } = req.body;

  try {
    // Construct the public URL for the video file
    //const baseUrl = `https://www.midnightsoldiers.com:${port}`;
    //const videoUrl = `${baseUrl}/video_files/${videoFileName}`;

    // Get file size
    const filePath = `./video_files/${videoFileName}`;
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    const reelData = {
      reelVideoUrl: videoUrl,
      reelSize: fileSizeInMB,
      reelName: reelName || "Test Reel",
      reelDescription:
        reelDescription || "Test upload - will delete soon! #test",
    };

    console.log("Uploading to Facebook with data:", reelData);
    const result = await postReelToFacebook(reelData);

    res.json({
      success: true,
      platform: "Facebook",
      result: result,
    });
  } catch (error) {
    console.error("Facebook upload test failed:", error);
    res.status(500).json({
      success: false,
      platform: "Facebook",
      error: error.message,
    });
  }
});

/*
 *  POST test Instagram reel upload
 */
app.post("/test/instagram-reel", async function (req, res) {
  console.log("Testing Instagram reel upload...");
  const { videoFileName, reelName, reelDescription } = req.body;

  try {
    // Construct the public URL for the video file
    const baseUrl = `https://www.midnightsoldiers.com:${port}`;
    const videoUrl = `${baseUrl}/video_files/${videoFileName}`;

    // Get file size
    const filePath = `./video_files/${videoFileName}`;
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    const reelData = {
      reelVideoUrl: videoUrl,
      reelSize: fileSizeInMB,
      reelName: reelName || "Test Reel",
      reelDescription:
        reelDescription || "Test upload - will delete soon! #test",
    };

    console.log("Uploading to Instagram with data:", reelData);
    const result = await postReelToInstagram(reelData);

    res.json({
      success: true,
      platform: "Instagram",
      result: result,
    });
  } catch (error) {
    console.error("Instagram upload test failed:", error);
    res.status(500).json({
      success: false,
      platform: "Instagram",
      error: error.message,
    });
  }
});

/*
 *  PUT route to post reel to both Facebook and Instagram
 */
app.put("/api/post-to-social/:reelId", async function (req, res) {
  console.log("POST TO SOCIAL MEDIA ENDPOINT CALLED");
  const { reelId } = req.params;
  const { reelName, reelDescription, reelVideoUrl, reelSize } = req.body;

  console.log("Reel ID:", reelId);
  console.log("Reel data received:", req.body);

  try {
    // Validate required fields
    if (!reelVideoUrl) {
      return res.status(400).json({
        success: false,
        error: "reelVideoUrl is required",
        reelId,
      });
    }

    // Validate URL format (must be HTTPS for social media APIs)
    try {
      const url = new URL(reelVideoUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return res.status(400).json({
          success: false,
          error: "reelVideoUrl must be a valid HTTP/HTTPS URL",
          reelId,
        });
      }
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: "reelVideoUrl is not a valid URL",
        reelId,
      });
    }

    // Validate file size
    if (!reelSize || typeof reelSize !== "number" || reelSize <= 0) {
      return res.status(400).json({
        success: false,
        error: "reelSize must be a positive number (in MB)",
        reelId,
      });
    }

    // Check file size limits
    // Facebook: 4GB max (4096 MB)
    // Instagram: 100MB recommended, 1GB max (1024 MB)
    const maxSizeMB = 1024; // Use Instagram's limit as it's more restrictive
    if (reelSize > maxSizeMB) {
      return res.status(400).json({
        success: false,
        error: `File size (${reelSize}MB) exceeds maximum allowed size (${maxSizeMB}MB for Instagram)`,
        reelId,
      });
    }

    // Warn if size is large (over 100MB)
    if (reelSize > 100) {
      console.warn(
        `Warning: File size (${reelSize}MB) exceeds Instagram's recommended size (100MB)`
      );
    }

    const reelData = {
      reelVideoUrl,
      reelSize,
      reelName: reelName || "Untitled Reel",
      reelDescription: reelDescription || "Posted from Midnight Soldiers",
    };

    console.log("Prepared reel data for APIs:", reelData);

    // Post to Facebook and Instagram in parallel
    const [facebookResult, instagramResult] = await Promise.allSettled([
      postReelToFacebook(reelData),
      postReelToInstagram(reelData),
    ]);

    // Process results
    const results = {
      reelId,
      facebook: {
        success: facebookResult.status === "fulfilled",
        data:
          facebookResult.status === "fulfilled" ? facebookResult.value : null,
        error:
          facebookResult.status === "rejected"
            ? facebookResult.reason.message
            : null,
      },
      instagram: {
        success: instagramResult.status === "fulfilled",
        data:
          instagramResult.status === "fulfilled" ? instagramResult.value : null,
        error:
          instagramResult.status === "rejected"
            ? instagramResult.reason.message
            : null,
      },
    };

    console.log("Social media posting results:", results);

    // Return success if at least one platform succeeded
    const overallSuccess =
      results.facebook.success || results.instagram.success;

    res.json({
      success: overallSuccess,
      message: overallSuccess
        ? "Reel posted to social media"
        : "Failed to post to any platform",
      results: results,
    });
  } catch (error) {
    console.error("Error in post-to-social endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      reelId,
    });
  }
});

console.log("app running on port", port);

app.listen(port);
