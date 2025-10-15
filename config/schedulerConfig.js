// Scheduler Configuration
// This file contains all configuration for the automated video posting system

module.exports = {
  // Scheduler settings
  scheduler: {
    // Enable/disable the scheduler
    enabled: true,
    
    // Cron schedule format: "second minute hour dayOfMonth month dayOfWeek"
    // Examples:
    // "0 18 * * *"      - Every day at 6:00 PM
    // "0 12,18 * * *"   - Every day at 12:00 PM and 6:00 PM
    // "0 18 * * 1-5"    - Monday through Friday at 6:00 PM
    // "*/30 * * * *"    - Every 30 minutes
    cronSchedule: "0 18 * * *", // Default: Every day at 6:00 PM
    
    // Timezone for scheduling (uses system timezone if not specified)
    timezone: "America/New_York",
  },

  // Queue settings
  queue: {
    // Storage type: "firestore" (recommended)
    storageType: "firestore",
    
    // Firestore collection name
    collectionName: "video_queue",
    
    // Archive posted videos (keep in Firestore with status "posted")
    archivePosted: true,
    
    // Retry failed posts
    retryFailedPosts: true,
    
    // Maximum number of retry attempts
    maxRetries: 3,
    
    // Delay between retries (in milliseconds)
    retryDelay: 60000, // 1 minute
  },

  // Posting settings
  posting: {
    // Which platforms to post to
    platforms: {
      facebook: true,
      instagram: true,
      tiktok: true,
    },
    
    // Require all platforms to succeed for overall success
    requireAllPlatforms: false,
    
    // Minimum number of platforms that must succeed
    minimumSuccessfulPlatforms: 1,
  },

  // File storage settings
  storage: {
    // Directory where pending videos are stored
    pendingDir: "./video_queue/pending/",
    
    // Directory where posted videos are archived
    postedDir: "./video_queue/posted/",
    
    // Move files to archive after successful post
    archiveFiles: false,
    
    // Delete files after successful post (takes precedence over archiveFiles)
    deleteAfterPost: false,
    
    // Base URL for accessing videos
    baseUrl: "https://www.midnightsoldiers.com",
    
    // Port (if different from standard 443/80)
    port: 3200,
  },

  // Logging settings
  logging: {
    // Enable verbose logging
    verbose: true,
    
    // Log successful posts
    logSuccess: true,
    
    // Log failed posts
    logFailures: true,
    
    // Log queue operations
    logQueueOps: true,
  },
};

