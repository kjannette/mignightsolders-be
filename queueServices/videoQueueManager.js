// Video Queue Manager
// Manages the queue of videos to be posted automatically using Firebase Firestore

const { db } = require("../firebase/firebaseConfig");
const { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} = require("firebase/firestore");
const config = require("../config/schedulerConfig");
const { v4: uuidv4 } = require("uuid");

class VideoQueueManager {
  constructor() {
    this.collectionName = config.queue.collectionName;
    console.log(`VideoQueueManager initialized with collection: ${this.collectionName}`);
  }

  /**
   * Add a video to the queue
   * @param {Object} videoData - Video metadata
   * @returns {Promise<Object>} - Added video document
   */
  async addToQueue(videoData) {
    try {
      const videoId = videoData.videoId || uuidv4();
      const now = new Date();

      const queueItem = {
        videoId,
        videoFileName: videoData.videoFileName,
        videoName: videoData.videoName || "Untitled Video",
        videoDescription: videoData.videoDescription || "",
        videoUrl: videoData.videoUrl,
        videoSize: videoData.videoSize || 0,
        status: "pending",
        dateAdded: Timestamp.fromDate(now),
        dateScheduled: videoData.scheduledTime 
          ? Timestamp.fromDate(new Date(videoData.scheduledTime))
          : Timestamp.fromDate(now),
        datePosted: null,
        postResults: null,
        retryCount: 0,
        lastError: null,
      };

      const docRef = await addDoc(collection(db, this.collectionName), queueItem);
      
      if (config.logging.logQueueOps) {
        console.log(`[QUEUE] Added video to queue: ${videoId} (${videoData.videoName})`);
      }

      return {
        id: docRef.id,
        ...queueItem,
      };
    } catch (error) {
      console.error("[QUEUE] Error adding video to queue:", error);
      throw error;
    }
  }

  /**
   * Get the next pending video to post (based on scheduled time)
   * @returns {Promise<Object|null>} - Next video to post or null
   */
  async getNextVideo() {
    try {
      const now = Timestamp.now();
      
      const q = query(
        collection(db, this.collectionName),
        where("status", "==", "pending"),
        where("dateScheduled", "<=", now),
        orderBy("dateScheduled", "asc"),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error("[QUEUE] Error getting next video:", error);
      throw error;
    }
  }

  /**
   * Get all scheduled videos that are ready to post
   * @returns {Promise<Array>} - Array of videos ready to post
   */
  async getScheduledVideos() {
    try {
      const now = Timestamp.now();
      
      const q = query(
        collection(db, this.collectionName),
        where("status", "==", "pending"),
        where("dateScheduled", "<=", now),
        orderBy("dateScheduled", "asc")
      );

      const querySnapshot = await getDocs(q);
      
      const videos = [];
      querySnapshot.forEach((doc) => {
        videos.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return videos;
    } catch (error) {
      console.error("[QUEUE] Error getting scheduled videos:", error);
      throw error;
    }
  }

  /**
   * Get all videos in queue (optionally filtered by status)
   * @param {string} status - Optional status filter (pending, posting, posted, failed)
   * @returns {Promise<Array>} - Array of videos
   */
  async getAllVideos(status = null) {
    try {
      let q;
      
      if (status) {
        q = query(
          collection(db, this.collectionName),
          where("status", "==", status),
          orderBy("dateAdded", "desc")
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          orderBy("dateAdded", "desc")
        );
      }

      const querySnapshot = await getDocs(q);
      
      const videos = [];
      querySnapshot.forEach((doc) => {
        videos.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return videos;
    } catch (error) {
      console.error("[QUEUE] Error getting all videos:", error);
      throw error;
    }
  }

  /**
   * Update video status
   * @param {string} docId - Firestore document ID
   * @param {string} status - New status (pending, posting, posted, failed)
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<void>}
   */
  async updateVideoStatus(docId, status, additionalData = {}) {
    try {
      const docRef = doc(db, this.collectionName, docId);
      
      const updateData = {
        status,
        ...additionalData,
      };

      if (status === "posted") {
        updateData.datePosted = Timestamp.now();
      }

      await updateDoc(docRef, updateData);

      if (config.logging.logQueueOps) {
        console.log(`[QUEUE] Updated video status to "${status}": ${docId}`);
      }
    } catch (error) {
      console.error("[QUEUE] Error updating video status:", error);
      throw error;
    }
  }

  /**
   * Mark video as posting (in progress)
   * @param {string} docId - Firestore document ID
   * @returns {Promise<void>}
   */
  async markAsPosting(docId) {
    return this.updateVideoStatus(docId, "posting");
  }

  /**
   * Mark video as posted (successful)
   * @param {string} docId - Firestore document ID
   * @param {Object} results - Post results from platforms
   * @returns {Promise<void>}
   */
  async markAsPosted(docId, results) {
    return this.updateVideoStatus(docId, "posted", {
      postResults: results,
    });
  }

  /**
   * Mark video as failed
   * @param {string} docId - Firestore document ID
   * @param {string} error - Error message
   * @param {number} retryCount - Current retry count
   * @returns {Promise<void>}
   */
  async markAsFailed(docId, error, retryCount = 0) {
    return this.updateVideoStatus(docId, "failed", {
      lastError: error,
      retryCount,
    });
  }

  /**
   * Increment retry count for a video
   * @param {string} docId - Firestore document ID
   * @param {number} currentRetryCount - Current retry count
   * @returns {Promise<void>}
   */
  async incrementRetryCount(docId, currentRetryCount) {
    const newRetryCount = currentRetryCount + 1;
    return this.updateVideoStatus(docId, "pending", {
      retryCount: newRetryCount,
      dateScheduled: Timestamp.fromDate(
        new Date(Date.now() + config.queue.retryDelay)
      ),
    });
  }

  /**
   * Remove video from queue
   * @param {string} docId - Firestore document ID
   * @returns {Promise<void>}
   */
  async removeFromQueue(docId) {
    try {
      const docRef = doc(db, this.collectionName, docId);
      await deleteDoc(docRef);

      if (config.logging.logQueueOps) {
        console.log(`[QUEUE] Removed video from queue: ${docId}`);
      }
    } catch (error) {
      console.error("[QUEUE] Error removing video from queue:", error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} - Queue stats
   */
  async getQueueStats() {
    try {
      const allVideos = await this.getAllVideos();
      
      const stats = {
        total: allVideos.length,
        pending: allVideos.filter((v) => v.status === "pending").length,
        posting: allVideos.filter((v) => v.status === "posting").length,
        posted: allVideos.filter((v) => v.status === "posted").length,
        failed: allVideos.filter((v) => v.status === "failed").length,
      };

      // Get next scheduled video
      const nextVideo = await this.getNextVideo();
      if (nextVideo) {
        stats.nextScheduled = nextVideo.dateScheduled.toDate().toISOString();
        stats.nextVideoName = nextVideo.videoName;
      } else {
        stats.nextScheduled = null;
        stats.nextVideoName = null;
      }

      return stats;
    } catch (error) {
      console.error("[QUEUE] Error getting queue stats:", error);
      throw error;
    }
  }

  /**
   * Get video by ID
   * @param {string} docId - Firestore document ID
   * @returns {Promise<Object|null>} - Video document or null
   */
  async getVideoById(docId) {
    try {
      const docRef = doc(db, this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("[QUEUE] Error getting video by ID:", error);
      throw error;
    }
  }

  /**
   * Clean up old posted videos (optional maintenance)
   * @param {number} daysOld - Remove videos older than this many days
   * @returns {Promise<number>} - Number of videos removed
   */
  async cleanupOldPostedVideos(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const q = query(
        collection(db, this.collectionName),
        where("status", "==", "posted"),
        where("datePosted", "<", Timestamp.fromDate(cutoffDate))
      );

      const querySnapshot = await getDocs(q);
      
      let removedCount = 0;
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(docSnapshot.ref);
        removedCount++;
      }

      console.log(`[QUEUE] Cleaned up ${removedCount} old posted videos`);
      return removedCount;
    } catch (error) {
      console.error("[QUEUE] Error cleaning up old videos:", error);
      throw error;
    }
  }
}

module.exports = new VideoQueueManager();

