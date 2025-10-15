const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Import API services
const { postReelToFacebook } = require("./postServices/facebookApiService.js");
const {
  postReelToInstagram,
} = require("./postServices/instagramApiService.js");
const postController = require("./postController/postController.js");

// Import queue services
const videoQueueManager = require("./queueServices/videoQueueManager.js");
const automatedPoster = require("./queueServices/automatedPoster.js");
const scheduler = require("./queueServices/scheduler.js");
const config = require("./config/schedulerConfig.js");

// Import TikTok credentials
const { TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET } = require("./secrets.js");
//const { db } = require("./firebase/firebase.js");

const { collection, query, where, getDocs } = require("firebase/firestore");
const port = 3200

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from video_queue directory
app.use('/video_queue', express.static(path.join(__dirname, 'video_queue')));

// Configure multer for video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './video_queue/pending/';
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const videoId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${videoId}${ext}`;
    // Store videoId in request for later use
    req.generatedVideoId = videoId;
    req.generatedFilename = filename;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only video files
    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, avi, webm)'));
    }
  }
});

/*
 *  GET TikTok OAuth callback - handles authorization code exchange
 */
app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  console.log('TikTok OAuth callback received:', { code: !!code, state, error, error_description });

  try {
    // Handle OAuth errors
    if (error) {
      console.error('TikTok OAuth error:', error, error_description);
      return res.redirect(`https://www.midnightsoldiers.com/reellogin?error=${encodeURIComponent(error_description || error)}`);
    }

    // Validate required parameters
    if (!code) {
      console.error('No authorization code received from TikTok');
      return res.redirect('https://www.midnightsoldiers.com/reellogin?error=No authorization code received');
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeTikTokCodeForToken(code);

    if (tokenResponse.success) {
      console.log('TikTok OAuth successful, redirecting to dashboard');
      // Store token in session or database as needed
      // For now, just redirect to success page with token info
      const successUrl = `https://www.midnightsoldiers.com/reellogin?success=true&tiktok_connected=true`;
      res.redirect(successUrl);
    } else {
      console.error('Token exchange failed:', tokenResponse.error);
      res.redirect(`https://www.midnightsoldiers.com/reellogin?error=${encodeURIComponent(tokenResponse.error)}`);
    }

  } catch (err) {
    console.error('Error in TikTok OAuth callback:', err);
    res.redirect(`https://www.midnightsoldiers.com/reellogin?error=${encodeURIComponent('Authentication failed')}`);
  }
});

/*
 *  TikTok OAuth helper function - exchanges code for access token
 */
async function exchangeTikTokCodeForToken(authorizationCode) {
  try {
    // TikTok token exchange endpoint
    const tokenUrl = 'https://open.tiktokapis.com/oauth/access_token/';

    // Get TikTok app credentials from secrets file
    const clientKey = TIKTOK_CLIENT_KEY;
    const clientSecret = TIKTOK_CLIENT_SECRET;
    const redirectUri = 'https://www.midnightsoldiers.com/auth/tiktok/callback';

    const response = await axios.post(tokenUrl, {
      client_key: clientKey,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data && response.data.access_token) {
      console.log('TikTok token exchange successful');
      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
    } else {
      return {
        success: false,
        error: 'Invalid response from TikTok token endpoint'
      };
    }

  } catch (error) {
    console.error('TikTok token exchange error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error_description || error.message || 'Token exchange failed'
    };
  }
}

/*
 *  POST store new reel data and automatically post to social media
 */

app.post("/v1/accept-reel-data/:reelId", async function (req, res) {
  console.log("accept-reel-data was hit by frontend");
  const { reelId } = req.params;
  const reelData = req.body;
  
  try {
    console.log("Data received by backend:", reelData);
    console.log("Reel ID:", reelId);
    
    // Validate required fields
    if (!reelData.reelVideoUrl) {
      return res.status(400).json({
        success: false,
        error: "reelVideoUrl is required",
        reelId
      });
    }
    
    // Automatically post to social media using PostController
    console.log("Starting automatic post to social media...");
    const result = await postController.handleReelPost(reelData);
    
    if (result.success) {
      console.log("Successfully posted to social media:", result);
      res.json({
        success: true,
        message: "Reel received and posted to social media",
        reelId,
        result
      });
    } else {
      console.error("Failed to post to social media:", result);
      res.status(500).json({
        success: false,
        message: "Reel received but failed to post to social media",
        reelId,
        error: result.error
      });
    }
  } catch (err) {
    console.error("============================================");
    console.error("ERROR at /v1/accept-reel-data/:reelId endpoint");
    console.error("Reel ID:", reelId);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Request body:", JSON.stringify(req.body, null, 2));
    console.error("============================================");
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      stack: err.stack,
      reelId
    });
  }
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

// ============================================
// VIDEO QUEUE MANAGEMENT ENDPOINTS
// ============================================

/*
 * POST /api/queue/upload - Upload video file and add to queue
 */
app.post("/api/queue/upload", upload.single('videoFile'), async function (req, res) {
  console.log("[API] Upload video to queue endpoint called");
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No video file provided"
      });
    }

    const { videoName, videoDescription, scheduledTime } = req.body;
    const videoId = req.generatedVideoId;
    const filename = req.generatedFilename;
    
    // Get file size in MB
    const fileSizeInMB = req.file.size / (1024 * 1024);
    
    // Construct video URL
    const baseUrl = config.storage.baseUrl;
    const port = config.storage.port;
    const videoUrl = `${baseUrl}:${port}/video_queue/pending/${filename}`;
    
    // Add to queue
    const queueItem = await videoQueueManager.addToQueue({
      videoId,
      videoFileName: filename,
      videoName: videoName || "Untitled Video",
      videoDescription: videoDescription || "",
      videoUrl,
      videoSize: fileSizeInMB,
      scheduledTime: scheduledTime || new Date().toISOString()
    });
    
    console.log(`[API] Video added to queue: ${videoId} - ${videoName}`);
    
    res.json({
      success: true,
      message: "Video uploaded and added to queue",
      video: queueItem
    });
    
  } catch (error) {
    console.error("[API] Error uploading video:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * POST /api/queue/add - Add video to queue (manual metadata entry)
 */
app.post("/api/queue/add", async function (req, res) {
  console.log("[API] Add video to queue endpoint called");
  
  try {
    const { videoFileName, videoName, videoDescription, videoUrl, videoSize, scheduledTime } = req.body;
    
    if (!videoFileName || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: "videoFileName and videoUrl are required"
      });
    }
    
    const queueItem = await videoQueueManager.addToQueue({
      videoFileName,
      videoName: videoName || "Untitled Video",
      videoDescription: videoDescription || "",
      videoUrl,
      videoSize: videoSize || 0,
      scheduledTime: scheduledTime || new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: "Video added to queue",
      video: queueItem
    });
    
  } catch (error) {
    console.error("[API] Error adding video to queue:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * GET /api/queue/status - Get queue statistics
 */
app.get("/api/queue/status", async function (req, res) {
  try {
    const stats = await videoQueueManager.getQueueStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("[API] Error getting queue status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * GET /api/queue/list - Get all videos in queue
 */
app.get("/api/queue/list", async function (req, res) {
  try {
    const { status } = req.query; // Optional filter by status
    
    const videos = await videoQueueManager.getAllVideos(status || null);
    
    res.json({
      success: true,
      count: videos.length,
      videos
    });
  } catch (error) {
    console.error("[API] Error listing queue:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * GET /api/queue/:videoId - Get specific video from queue
 */
app.get("/api/queue/:videoId", async function (req, res) {
  try {
    const { videoId } = req.params;
    
    const video = await videoQueueManager.getVideoById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: "Video not found in queue"
      });
    }
    
    res.json({
      success: true,
      video
    });
  } catch (error) {
    console.error("[API] Error getting video:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * DELETE /api/queue/:videoId - Remove video from queue
 */
app.delete("/api/queue/:videoId", async function (req, res) {
  try {
    const { videoId } = req.params;
    
    await videoQueueManager.removeFromQueue(videoId);
    
    res.json({
      success: true,
      message: "Video removed from queue"
    });
  } catch (error) {
    console.error("[API] Error removing video:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * POST /api/queue/post-next - Manually trigger posting of next video
 */
app.post("/api/queue/post-next", async function (req, res) {
  console.log("[API] Manual post-next triggered");
  
  try {
    const result = await automatedPoster.postNext();
    
    res.json({
      success: result.success,
      message: result.message || "Post operation completed",
      result
    });
  } catch (error) {
    console.error("[API] Error in post-next:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SCHEDULER CONTROL ENDPOINTS
// ============================================

/*
 * POST /api/scheduler/start - Start the scheduler
 */
app.post("/api/scheduler/start", function (req, res) {
  console.log("[API] Start scheduler endpoint called");
  
  try {
    const result = scheduler.start();
    res.json(result);
  } catch (error) {
    console.error("[API] Error starting scheduler:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * POST /api/scheduler/stop - Stop the scheduler
 */
app.post("/api/scheduler/stop", function (req, res) {
  console.log("[API] Stop scheduler endpoint called");
  
  try {
    const result = scheduler.stop();
    res.json(result);
  } catch (error) {
    console.error("[API] Error stopping scheduler:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * POST /api/scheduler/restart - Restart the scheduler
 */
app.post("/api/scheduler/restart", function (req, res) {
  console.log("[API] Restart scheduler endpoint called");
  
  try {
    const { cronSchedule } = req.body;
    const result = scheduler.restart(cronSchedule);
    res.json(result);
  } catch (error) {
    console.error("[API] Error restarting scheduler:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * GET /api/scheduler/status - Get scheduler status
 */
app.get("/api/scheduler/status", async function (req, res) {
  try {
    const status = await scheduler.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error("[API] Error getting scheduler status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/*
 * PUT /api/scheduler/config - Update scheduler configuration
 */
app.put("/api/scheduler/config", function (req, res) {
  console.log("[API] Update scheduler config endpoint called");
  
  try {
    const { cronSchedule } = req.body;
    
    if (!cronSchedule) {
      return res.status(400).json({
        success: false,
        error: "cronSchedule is required"
      });
    }
    
    const result = scheduler.updateSchedule(cronSchedule);
    res.json(result);
  } catch (error) {
    console.error("[API] Error updating scheduler config:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log("app running on port", port);
console.log("Automated video posting system initialized");
console.log(`- Queue management: /api/queue/*`);
console.log(`- Scheduler control: /api/scheduler/*`);

app.listen(port);
