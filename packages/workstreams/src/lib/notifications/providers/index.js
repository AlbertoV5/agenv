// src/lib/notifications/providers/macos-sound.ts
import { spawn } from "child_process";
import { existsSync } from "fs";

// src/lib/notifications/types.ts
import { join } from "path";
import { homedir } from "os";
var CONFIG_PATH = join(homedir(), ".config", "agenv", "notifications.json");
var DEFAULT_SOUNDS = {
  thread_complete: "/System/Library/Sounds/Glass.aiff",
  batch_complete: "/System/Library/Sounds/Hero.aiff",
  error: "/System/Library/Sounds/Basso.aiff",
  thread_synthesis_complete: "/System/Library/Sounds/Purr.aiff"
};

// src/lib/notifications/providers/macos-sound.ts
class MacOSSoundProvider {
  name = "macos-sound";
  soundMappings;
  enabled;
  queue = [];
  isPlaying = false;
  constructor(config) {
    this.soundMappings = config?.sounds ?? {};
    this.enabled = config?.enabled !== false;
  }
  isAvailable() {
    return process.platform === "darwin";
  }
  playNotification(event, _metadata) {
    if (!this.enabled || !this.isAvailable()) {
      return;
    }
    const soundPath = this.getSoundPath(event);
    if (!existsSync(soundPath)) {
      return;
    }
    this.queue.push(soundPath);
    if (!this.isPlaying) {
      this.playNext();
    }
  }
  playNext() {
    const soundPath = this.queue.shift();
    if (!soundPath) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const child = spawn("afplay", [soundPath], {
      stdio: "ignore"
    });
    child.on("exit", () => {
      this.playNext();
    });
    child.on("error", () => {
      this.playNext();
    });
  }
  getSoundPath(event) {
    const customPath = this.soundMappings[event];
    if (customPath && existsSync(customPath)) {
      return customPath;
    }
    return DEFAULT_SOUNDS[event];
  }
  getQueueLength() {
    return this.queue.length;
  }
  getIsPlaying() {
    return this.isPlaying;
  }
  clearQueue() {
    this.queue = [];
    this.isPlaying = false;
  }
}
// src/lib/notifications/providers/external-api.ts
class ExternalApiProvider {
  name = "external-api";
  config;
  constructor(config) {
    this.config = config ?? { enabled: false };
  }
  isAvailable() {
    return this.config.enabled && !!this.config.webhook_url;
  }
  playNotification(event, metadata) {
    if (!this.isAvailable()) {
      return;
    }
    if (this.config.events && !this.config.events.includes(event)) {
      return;
    }
  }
  buildPayload(event, metadata) {
    return {
      event,
      timestamp: new Date().toISOString(),
      metadata,
      synthesisOutput: metadata?.synthesisOutput,
      threadId: metadata?.threadId
    };
  }
}
// src/lib/notifications/providers/terminal-notifier.ts
import { spawn as spawn2, execSync } from "child_process";
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

class TerminalNotifierProvider {
  name = "terminal-notifier";
  config;
  availabilityChecked = false;
  isAvailableCache = false;
  installMessageLogged = false;
  constructor(config) {
    this.config = config ?? { enabled: true };
  }
  isAvailable() {
    if (this.availabilityChecked) {
      return this.isAvailableCache;
    }
    this.availabilityChecked = true;
    if (process.platform !== "darwin") {
      this.isAvailableCache = false;
      return false;
    }
    try {
      execSync("which terminal-notifier", { stdio: "ignore" });
      this.isAvailableCache = true;
      return true;
    } catch {
      this.isAvailableCache = false;
      return false;
    }
  }
  playNotification(event, metadata) {
    if (!this.config.enabled) {
      return;
    }
    if (!this.isAvailable()) {
      this.logInstallationMessage();
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
    const args = ["-title", title, "-message", message, "-sound", "default", "-group", "workstreams"];
    const clickAction = this.config.click_action ?? "activate_vscode";
    if (clickAction === "activate_vscode") {
      args.push("-activate", "com.microsoft.VSCode");
    } else if (clickAction === "open_url" && metadata?.threadId) {
      args.push("-activate", "com.microsoft.VSCode");
    }
    spawn2("terminal-notifier", args, {
      stdio: "ignore",
      detached: true
    }).unref();
  }
  logInstallationMessage() {
    if (this.installMessageLogged) {
      return;
    }
    this.installMessageLogged = true;
    console.log(`
[notifications] terminal-notifier is enabled but not installed.
` + `Install it with: brew install terminal-notifier
` + `For more info: https://github.com/julienXX/terminal-notifier
`);
  }
}
// src/lib/notifications/providers/macos-notification-center.ts
import { spawn as spawn3 } from "child_process";
var EVENT_TITLES2 = {
  thread_complete: "Thread Complete",
  batch_complete: "Batch Complete",
  error: "Error",
  thread_synthesis_complete: "Synthesis Complete"
};
var EVENT_MESSAGES2 = {
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
    const title = EVENT_TITLES2[event];
    let message = EVENT_MESSAGES2[event];
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
    spawn3("osascript", ["-e", script], {
      stdio: "ignore",
      detached: true
    }).unref();
  }
  escapeAppleScript(str) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  }
}
export {
  TerminalNotifierProvider,
  MacOSSoundProvider,
  MacOSNotificationCenterProvider,
  ExternalApiProvider
};
