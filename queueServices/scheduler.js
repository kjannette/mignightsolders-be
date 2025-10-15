// Scheduler
// Manages the cron schedule for automated video posting

const cron = require("node-cron");
const automatedPoster = require("./automatedPoster");
const videoQueueManager = require("./videoQueueManager");
const config = require("../config/schedulerConfig");

class Scheduler {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.runCount = 0;
    console.log("Scheduler initialized");
  }

  /**
   * Start the scheduler
   * @param {string} cronSchedule - Optional cron schedule (overrides config)
   * @returns {Object} - Status information
   */
  start(cronSchedule = null) {
    try {
      // If already running, stop first
      if (this.isRunning) {
        console.log("[SCHEDULER] Already running, stopping first...");
        this.stop();
      }

      const schedule = cronSchedule || config.scheduler.cronSchedule;

      // Validate cron schedule
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron schedule: ${schedule}`);
      }

      console.log(`[SCHEDULER] Starting with schedule: ${schedule}`);
      if (config.scheduler.timezone) {
        console.log(`[SCHEDULER] Timezone: ${config.scheduler.timezone}`);
      }

      // Create cron job
      this.cronJob = cron.schedule(
        schedule,
        async () => {
          await this.runScheduledTask();
        },
        {
          scheduled: true,
          timezone: config.scheduler.timezone || undefined,
        }
      );

      this.isRunning = true;
      this.updateNextRunTime();

      console.log(
        `✅ [SCHEDULER] Started successfully. Next run: ${this.nextRun}`
      );

      return {
        success: true,
        message: "Scheduler started",
        schedule,
        timezone: config.scheduler.timezone,
        nextRun: this.nextRun,
      };
    } catch (error) {
      console.error("[SCHEDULER] Error starting scheduler:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stop the scheduler
   * @returns {Object} - Status information
   */
  stop() {
    try {
      if (!this.isRunning) {
        console.log("[SCHEDULER] Not running, nothing to stop");
        return {
          success: true,
          message: "Scheduler was not running",
        };
      }

      if (this.cronJob) {
        this.cronJob.stop();
        this.cronJob = null;
      }

      this.isRunning = false;
      this.nextRun = null;

      console.log("⏹️  [SCHEDULER] Stopped");

      return {
        success: true,
        message: "Scheduler stopped",
      };
    } catch (error) {
      console.error("[SCHEDULER] Error stopping scheduler:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Restart the scheduler
   * @param {string} cronSchedule - Optional new cron schedule
   * @returns {Object} - Status information
   */
  restart(cronSchedule = null) {
    console.log("[SCHEDULER] Restarting...");
    this.stop();
    return this.start(cronSchedule);
  }

  /**
   * Run the scheduled task (called by cron)
   */
  async runScheduledTask() {
    try {
      this.runCount++;
      this.lastRun = new Date().toISOString();

      console.log(
        `\n⏰ [SCHEDULER] Running scheduled task (run #${this.runCount}) at ${this.lastRun}`
      );

      // Check and post videos
      const result = await automatedPoster.checkAndPost();

      if (result.success && result.videoId) {
        console.log(
          `[SCHEDULER] Task completed successfully. Posted: ${result.videoName}`
        );
      } else if (result.message === "No videos to post") {
        console.log("[SCHEDULER] Task completed. No videos were ready to post.");
      } else {
        console.log(
          `[SCHEDULER] Task completed with errors: ${result.error || "Unknown error"}`
        );
      }

      this.updateNextRunTime();
    } catch (error) {
      console.error("[SCHEDULER] Error in scheduled task:", error);
    }
  }

  /**
   * Update the next run time (for status reporting)
   */
  updateNextRunTime() {
    try {
      if (this.cronJob) {
        // Parse cron expression to estimate next run
        // This is a simplified estimation
        const schedule = config.scheduler.cronSchedule;
        const parts = schedule.split(" ");

        // For daily schedules like "0 18 * * *" (6 PM daily)
        if (parts.length >= 5) {
          const [minute, hour] = parts;
          const now = new Date();
          const next = new Date();

          next.setHours(parseInt(hour), parseInt(minute), 0, 0);

          // If time has passed today, set to tomorrow
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }

          this.nextRun = next.toISOString();
        } else {
          this.nextRun = "Calculating...";
        }
      }
    } catch (error) {
      this.nextRun = "Unknown";
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} - Status information
   */
  async getStatus() {
    try {
      const queueStats = await videoQueueManager.getQueueStats();

      return {
        running: this.isRunning,
        schedule: config.scheduler.cronSchedule,
        timezone: config.scheduler.timezone,
        enabled: config.scheduler.enabled,
        lastRun: this.lastRun,
        nextRun: this.nextRun,
        runCount: this.runCount,
        queue: queueStats,
        config: {
          retryEnabled: config.queue.retryFailedPosts,
          maxRetries: config.queue.maxRetries,
          platforms: config.posting.platforms,
        },
      };
    } catch (error) {
      console.error("[SCHEDULER] Error getting status:", error);
      return {
        running: this.isRunning,
        error: error.message,
      };
    }
  }

  /**
   * Update the cron schedule
   * @param {string} newSchedule - New cron schedule
   * @returns {Object} - Status information
   */
  updateSchedule(newSchedule) {
    if (!cron.validate(newSchedule)) {
      return {
        success: false,
        error: `Invalid cron schedule: ${newSchedule}`,
      };
    }

    console.log(`[SCHEDULER] Updating schedule to: ${newSchedule}`);

    // Update config (in memory only)
    config.scheduler.cronSchedule = newSchedule;

    // Restart with new schedule
    return this.restart(newSchedule);
  }

  /**
   * Check if scheduler is running
   * @returns {boolean}
   */
  isSchedulerRunning() {
    return this.isRunning;
  }
}

// Create singleton instance
const scheduler = new Scheduler();

// Auto-start if enabled in config
if (config.scheduler.enabled) {
  console.log("[SCHEDULER] Auto-start enabled in config");
  // Delay start by 5 seconds to allow server to fully initialize
  setTimeout(() => {
    scheduler.start();
  }, 5000);
}

module.exports = scheduler;

