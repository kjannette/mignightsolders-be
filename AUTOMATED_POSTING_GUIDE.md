# Automated Video Posting System - User Guide

## 🎯 Overview

The automated video posting system allows you to schedule and automatically post videos to Facebook, Instagram, and TikTok on a recurring schedule. Videos are stored in a queue and posted at specified times without manual intervention.

## 🚀 Quick Start

### 1. Prerequisites

Before using the automated posting system, ensure:
- Firebase Firestore is configured (see Firebase Setup below)
- Social media platform credentials are set in `secrets.js`
- Backend server is running on port 3200

### 2. Firebase Setup

The system requires Firebase configuration. Add these values to your environment variables or update `/firebase/firebaseConfig.js`:

```bash
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

### 3. Start the Server

```bash
cd midnightsoldiers-be
npm install
npm start
```

The scheduler will auto-start if `enabled: true` in `config/schedulerConfig.js`.

---

## 📁 Directory Structure

```
midnightsoldiers-be/
├── video_queue/
│   ├── pending/          # Videos waiting to be posted
│   └── posted/           # Archive of posted videos (optional)
├── queueServices/
│   ├── videoQueueManager.js    # Manages video queue in Firestore
│   ├── automatedPoster.js      # Handles posting logic
│   └── scheduler.js            # Cron scheduler
├── config/
│   └── schedulerConfig.js      # Configuration settings
└── firebase/
    └── firebaseConfig.js       # Firebase setup
```

---

## 🎬 Adding Videos to Queue

### Method 1: Upload via API (Recommended)

Upload a video file directly through the API:

```bash
curl -X POST http://localhost:3200/api/queue/upload \
  -F "videoFile=@/path/to/video.mp4" \
  -F "videoName=Amazing Art Piece" \
  -F "videoDescription=Check out this incredible work! #art #midnight" \
  -F "scheduledTime=2025-10-20T18:00:00Z"
```

**Parameters:**
- `videoFile` (required): Video file to upload
- `videoName` (required): Title of the video
- `videoDescription` (optional): Description/caption for the video
- `scheduledTime` (optional): ISO 8601 timestamp for when to post (defaults to now)

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded and added to queue",
  "video": {
    "id": "firestore-doc-id",
    "videoId": "uuid-1234",
    "videoName": "Amazing Art Piece",
    "videoUrl": "https://www.midnightsoldiers.com:3200/video_queue/pending/uuid-1234.mp4",
    "status": "pending",
    "dateScheduled": "2025-10-20T18:00:00Z"
  }
}
```

### Method 2: Manual File + Metadata API

1. Manually upload video to `video_queue/pending/` via SFTP/SCP
2. Add metadata via API:

```bash
curl -X POST http://localhost:3200/api/queue/add \
  -H "Content-Type: application/json" \
  -d '{
    "videoFileName": "my-video.mp4",
    "videoName": "Amazing Art Piece",
    "videoDescription": "Check out this incredible work! #art #midnight",
    "videoUrl": "https://www.midnightsoldiers.com:3200/video_queue/pending/my-video.mp4",
    "videoSize": 25.5,
    "scheduledTime": "2025-10-20T18:00:00Z"
  }'
```

---

## 📊 Queue Management

### Get Queue Status

```bash
curl http://localhost:3200/api/queue/status
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "pending": 5,
    "posting": 0,
    "posted": 4,
    "failed": 1,
    "nextScheduled": "2025-10-20T18:00:00Z",
    "nextVideoName": "Amazing Art Piece"
  }
}
```

### List All Videos in Queue

```bash
# All videos
curl http://localhost:3200/api/queue/list

# Filter by status (pending, posting, posted, failed)
curl http://localhost:3200/api/queue/list?status=pending
```

### Get Specific Video

```bash
curl http://localhost:3200/api/queue/:videoId
```

### Remove Video from Queue

```bash
curl -X DELETE http://localhost:3200/api/queue/:videoId
```

### Manually Post Next Video

Trigger immediate posting of the next scheduled video:

```bash
curl -X POST http://localhost:3200/api/queue/post-next
```

---

## ⏰ Scheduler Control

### Check Scheduler Status

```bash
curl http://localhost:3200/api/scheduler/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "running": true,
    "schedule": "0 18 * * *",
    "timezone": "America/New_York",
    "enabled": true,
    "lastRun": "2025-10-15T18:00:00Z",
    "nextRun": "2025-10-16T18:00:00Z",
    "runCount": 42,
    "queue": { "pending": 5, "posted": 37, "failed": 0 }
  }
}
```

### Start Scheduler

```bash
curl -X POST http://localhost:3200/api/scheduler/start
```

### Stop Scheduler

```bash
curl -X POST http://localhost:3200/api/scheduler/stop
```

### Restart Scheduler

```bash
curl -X POST http://localhost:3200/api/scheduler/restart
```

### Update Schedule

Change the posting schedule:

```bash
curl -X PUT http://localhost:3200/api/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"cronSchedule": "0 12,18 * * *"}'
```

---

## ⚙️ Configuration

Edit `/config/schedulerConfig.js` to customize behavior:

### Scheduler Settings

```javascript
scheduler: {
  enabled: true,                    // Auto-start on server launch
  cronSchedule: "0 18 * * *",      // Daily at 6:00 PM
  timezone: "America/New_York",    // Timezone for scheduling
}
```

**Cron Schedule Examples:**
- `"0 18 * * *"` - Every day at 6:00 PM
- `"0 12,18 * * *"` - Every day at 12:00 PM and 6:00 PM
- `"0 18 * * 1-5"` - Monday through Friday at 6:00 PM
- `"*/30 * * * *"` - Every 30 minutes
- `"0 9 * * MON"` - Every Monday at 9:00 AM

### Queue Settings

```javascript
queue: {
  storageType: "firestore",        // Metadata storage (firestore)
  collectionName: "video_queue",   // Firestore collection name
  archivePosted: true,             // Keep posted videos in Firestore
  retryFailedPosts: true,          // Retry failed posts
  maxRetries: 3,                   // Maximum retry attempts
  retryDelay: 60000,               // Delay between retries (1 minute)
}
```

### Posting Settings

```javascript
posting: {
  platforms: {
    facebook: true,                // Post to Facebook
    instagram: true,               // Post to Instagram
    tiktok: true,                  // Post to TikTok
  },
  requireAllPlatforms: false,      // Require all to succeed
  minimumSuccessfulPlatforms: 1,   // Minimum platforms for success
}
```

### Storage Settings

```javascript
storage: {
  pendingDir: "./video_queue/pending/",
  postedDir: "./video_queue/posted/",
  archiveFiles: false,             // Move to archive after post
  deleteAfterPost: false,          // Delete after successful post
  baseUrl: "https://www.midnightsoldiers.com",
  port: 3200,
}
```

---

## 🔄 How It Works

### Posting Workflow

1. **Video Added to Queue**
   - Video uploaded via API or manually
   - Metadata stored in Firestore with status `pending`
   - Scheduled time set

2. **Scheduler Runs (Cron Job)**
   - Checks Firestore for videos with `dateScheduled <= now` and status `pending`
   - If found, triggers automated poster

3. **Automated Posting**
   - Updates status to `posting`
   - Calls existing `postController.handleReelPost()`
   - Posts to Facebook, Instagram, and TikTok in parallel

4. **Success Handling**
   - Updates status to `posted`
   - Stores post results in Firestore
   - Optionally archives or deletes video file

5. **Failure Handling**
   - If retry enabled and retries remaining:
     - Increments retry count
     - Reschedules for later (current time + retryDelay)
   - If max retries reached:
     - Updates status to `failed`
     - Stores error message

### Queue Priority

Videos are posted in FIFO order based on `dateScheduled` (earliest first).

---

## 📝 Firestore Data Structure

Videos in the queue are stored in Firestore with this structure:

```javascript
{
  videoId: "uuid-1234",
  videoFileName: "video1.mp4",
  videoName: "Amazing Art Piece",
  videoDescription: "Check out this incredible work! #art #midnight",
  videoUrl: "https://www.midnightsoldiers.com:3200/video_queue/pending/uuid-1234.mp4",
  videoSize: 25.5,                    // MB
  status: "pending",                  // pending, posting, posted, failed
  dateAdded: Timestamp,
  dateScheduled: Timestamp,
  datePosted: Timestamp,
  postResults: {
    facebook: { success: true, data: {...} },
    instagram: { success: true, data: {...} },
    tiktok: { success: false, error: "..." }
  },
  retryCount: 0,
  lastError: null
}
```

---

## 🛠️ Troubleshooting

### Scheduler Not Starting

1. Check `config/schedulerConfig.js` - ensure `enabled: true`
2. Check Firebase connection - ensure credentials are correct
3. Check console for error messages on server start

### Videos Not Posting

1. Check queue status: `GET /api/queue/status`
2. Check scheduler status: `GET /api/scheduler/status`
3. Verify video `dateScheduled` is in the past
4. Check social media platform credentials in `secrets.js`
5. Review server logs for errors

### Failed Posts

1. Check Firestore for error details:
   ```bash
   curl http://localhost:3200/api/queue/list?status=failed
   ```
2. Common issues:
   - Invalid video URL (not accessible)
   - Social media API token expired
   - Video file too large (>1GB Instagram limit)
   - Invalid video format

### Manual Intervention

To manually retry a failed post:
1. Get the failed video's Firestore document ID
2. Update status back to `pending` (via Firestore console)
3. Optionally trigger: `POST /api/queue/post-next`

---

## 🔐 Security Notes

1. **Video URLs must be publicly accessible** - social media APIs download videos from provided URLs
2. **Protect API endpoints** - consider adding authentication middleware
3. **Firebase credentials** - keep secrets.js and environment variables secure
4. **Video file permissions** - ensure `video_queue/` directory has proper permissions

---

## 📈 Monitoring & Logs

### Log Levels

Configure in `schedulerConfig.js`:

```javascript
logging: {
  verbose: true,        // Detailed logs
  logSuccess: true,     // Log successful posts
  logFailures: true,    // Log failed posts
  logQueueOps: true,    // Log queue operations
}
```

### Log Examples

```
[SCHEDULER] Running scheduled task (run #42) at 2025-10-15T18:00:00Z
[AUTOPOSTER] Found video to post: "Amazing Art Piece" (ID: uuid-1234)
[AUTOPOSTER] Posting to social media platforms...
✅ [AUTOPOSTER] Successfully posted "Amazing Art Piece" to: Facebook, Instagram, TikTok
[SCHEDULER] Task completed successfully. Posted: Amazing Art Piece
```

---

## 🎉 Example Usage Workflow

### Typical Daily Workflow

1. **Morning**: Upload 1-3 videos for the day
   ```bash
   curl -X POST http://localhost:3200/api/queue/upload \
     -F "videoFile=@morning-video.mp4" \
     -F "videoName=Morning Inspiration" \
     -F "videoDescription=Start your day right! #morning" \
     -F "scheduledTime=2025-10-20T09:00:00Z"
   ```

2. **Check Queue**
   ```bash
   curl http://localhost:3200/api/queue/status
   ```

3. **Scheduler Automatically Posts**
   - At 9:00 AM, 12:00 PM, 6:00 PM (based on your cron schedule)
   - Videos posted in order of `dateScheduled`

4. **Review Results**
   ```bash
   curl http://localhost:3200/api/queue/list?status=posted
   ```

### Batch Upload

Upload multiple videos at once:

```bash
for video in videos/*.mp4; do
  curl -X POST http://localhost:3200/api/queue/upload \
    -F "videoFile=@$video" \
    -F "videoName=$(basename $video .mp4)" \
    -F "videoDescription=Amazing content! #art"
done
```

---

## 🆘 Support

For issues or questions:
1. Check server logs in console
2. Review Firestore `video_queue` collection
3. Test individual API endpoints
4. Verify social media platform credentials

---

## 🎯 Next Steps

1. **Configure Firebase** - Add your Firebase credentials
2. **Set Schedule** - Edit `cronSchedule` in config
3. **Upload Test Video** - Try the upload API
4. **Monitor Logs** - Watch the console for scheduler activity
5. **Review Results** - Check Firestore after scheduled post

**🎬 Happy Automated Posting!**

