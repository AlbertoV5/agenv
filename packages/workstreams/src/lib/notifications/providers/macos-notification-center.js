// src/lib/notifications/providers/macos-notification-center.ts
import { spawn } from "child_process";
var EVENT_TITLES = {
  thread_complete: "Thread Complete",
  batch_complete: "Batch Complete",
  error: "Error",
  thread_synthesis_complete: "Synthesis Complete"
};
var EVENT_MESSAGES = {
  thread_complete: "A thread has completed successfully",
  batch_complete: "Batch processing complete",
  error: "An error occurred during processing",
  thread_synthesis_complete: "Thread synthesis has completed"
};

class MacOSNotificationCenterProvider {
  name = "macos-notification-center";
  config;
  constructor(config) {
    this.config = config ?? { enabled: true };
  }
  isAvailable() {
    return process.platform === "darwin";
  }
  playNotification(event, metadata) {
    if (!this.config.enabled) {
      return;
    }
    if (!this.isAvailable()) {
      return;
    }
    const title = EVENT_TITLES[event];
    let message = EVENT_MESSAGES[event];
    if (metadata?.threadId) {
      message = `Thread ${metadata.threadId}: ${message}`;
    }
    if (metadata?.synthesisOutput) {
      const synthesis = metadata.synthesisOutput;
      if (synthesis.length <= 200) {
        message = synthesis;
      } else {
        message = synthesis.substring(0, 197) + "...";
      }
    }
    const escapedTitle = this.escapeAppleScript(title);
    const escapedMessage = this.escapeAppleScript(message);
    const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name "default"`;
    spawn("osascript", ["-e", script], {
      stdio: "ignore",
      detached: true
    }).unref();
  }
  escapeAppleScript(str) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  }
}
export {
  MacOSNotificationCenterProvider
};
