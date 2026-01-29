// src/lib/notifications/providers/terminal-notifier.ts
import { spawn, execSync } from "child_process";
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
    spawn("terminal-notifier", args, {
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
export {
  TerminalNotifierProvider
};
