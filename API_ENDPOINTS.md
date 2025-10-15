# Automated Video Posting API - Quick Reference

## Base URL
```
http://localhost:3200
```

---

## 📤 Queue Management Endpoints

### POST /api/queue/upload
Upload a video file and add to queue

**Content-Type:** `multipart/form-data`

**Body:**
```
videoFile: (file) Video file to upload
videoName: (string) Title of the video
videoDescription: (string) Optional description/caption
scheduledTime: (string) Optional ISO 8601 timestamp
```

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded and added to queue",
  "video": { ... }
}
```

---

### POST /api/queue/add
Add video metadata to queue (manual)

**Content-Type:** `application/json`

**Body:**
```json
{
  "videoFileName": "video.mp4",
  "videoName": "Video Title",
  "videoDescription": "Optional description",
  "videoUrl": "https://www.midnightsoldiers.com:3200/video_queue/pending/video.mp4",
  "videoSize": 25.5,
  "scheduledTime": "2025-10-20T18:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video added to queue",
  "video": { ... }
}
```

---

### GET /api/queue/status
Get queue statistics

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

---

### GET /api/queue/list
List all videos in queue

**Query Parameters:**
- `status` (optional): Filter by status (pending, posting, posted, failed)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "videos": [
    {
      "id": "firestore-doc-id",
      "videoId": "uuid-1234",
      "videoName": "Video Title",
      "status": "pending",
      "dateScheduled": "2025-10-20T18:00:00Z",
      ...
    }
  ]
}
```

---

### GET /api/queue/:videoId
Get specific video from queue

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "firestore-doc-id",
    "videoId": "uuid-1234",
    "videoName": "Video Title",
    "status": "pending",
    ...
  }
}
```

---

### DELETE /api/queue/:videoId
Remove video from queue

**Response:**
```json
{
  "success": true,
  "message": "Video removed from queue"
}
```

---

### POST /api/queue/post-next
Manually trigger posting of next scheduled video

**Response:**
```json
{
  "success": true,
  "message": "Post operation completed",
  "result": {
    "videoId": "uuid-1234",
    "videoName": "Video Title",
    "results": { ... }
  }
}
```

---

## ⏰ Scheduler Control Endpoints

### GET /api/scheduler/status
Get scheduler status and queue info

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
    "queue": {
      "pending": 5,
      "posted": 37,
      "failed": 0
    },
    "config": {
      "retryEnabled": true,
      "maxRetries": 3,
      "platforms": {
        "facebook": true,
        "instagram": true,
        "tiktok": true
      }
    }
  }
}
```

---

### POST /api/scheduler/start
Start the scheduler

**Response:**
```json
{
  "success": true,
  "message": "Scheduler started",
  "schedule": "0 18 * * *",
  "timezone": "America/New_York",
  "nextRun": "2025-10-16T18:00:00Z"
}
```

---

### POST /api/scheduler/stop
Stop the scheduler

**Response:**
```json
{
  "success": true,
  "message": "Scheduler stopped"
}
```

---

### POST /api/scheduler/restart
Restart the scheduler (optionally with new schedule)

**Content-Type:** `application/json`

**Body (optional):**
```json
{
  "cronSchedule": "0 12,18 * * *"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduler started",
  "schedule": "0 12,18 * * *",
  "nextRun": "2025-10-16T12:00:00Z"
}
```

---

### PUT /api/scheduler/config
Update scheduler configuration

**Content-Type:** `application/json`

**Body:**
```json
{
  "cronSchedule": "0 9,12,18 * * *"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduler started",
  "schedule": "0 9,12,18 * * *",
  "nextRun": "2025-10-16T09:00:00Z"
}
```

---

## 📋 Cron Schedule Examples

| Schedule | Description |
|----------|-------------|
| `0 18 * * *` | Every day at 6:00 PM |
| `0 12,18 * * *` | Every day at 12:00 PM and 6:00 PM |
| `0 18 * * 1-5` | Monday through Friday at 6:00 PM |
| `*/30 * * * *` | Every 30 minutes |
| `0 9 * * MON` | Every Monday at 9:00 AM |
| `0 8-17 * * 1-5` | Every hour 8AM-5PM, Mon-Fri |
| `0 0 * * *` | Every day at midnight |
| `0 */6 * * *` | Every 6 hours |

---

## 🔄 Video Status Values

| Status | Description |
|--------|-------------|
| `pending` | Waiting to be posted |
| `posting` | Currently being posted |
| `posted` | Successfully posted to platforms |
| `failed` | Post failed (will retry if enabled) |

---

## 🛠️ cURL Examples

### Upload Video
```bash
curl -X POST http://localhost:3200/api/queue/upload \
  -F "videoFile=@/path/to/video.mp4" \
  -F "videoName=My Amazing Video" \
  -F "videoDescription=Check this out! #amazing" \
  -F "scheduledTime=2025-10-20T18:00:00Z"
```

### Check Queue Status
```bash
curl http://localhost:3200/api/queue/status
```

### List Pending Videos
```bash
curl "http://localhost:3200/api/queue/list?status=pending"
```

### Check Scheduler Status
```bash
curl http://localhost:3200/api/scheduler/status
```

### Start Scheduler
```bash
curl -X POST http://localhost:3200/api/scheduler/start
```

### Update Schedule
```bash
curl -X PUT http://localhost:3200/api/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{"cronSchedule": "0 12,18 * * *"}'
```

### Manually Post Next Video
```bash
curl -X POST http://localhost:3200/api/queue/post-next
```

### Remove Video from Queue
```bash
curl -X DELETE http://localhost:3200/api/queue/abc123
```

---

## 📊 Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (video doesn't exist)
- `500` - Internal Server Error

---

## 🔐 Authentication

**Note:** Currently, these endpoints are not authenticated. Consider adding authentication middleware for production use.

Example authentication header (if implemented):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3200/api/queue/status
```

