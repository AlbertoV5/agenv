// src/lib/notifications/types.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
var CONFIG_PATH = join(homedir(), ".config", "agenv", "notifications.json");
function loadConfig(configPath = CONFIG_PATH) {
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
var DEFAULT_SOUNDS = {
  thread_complete: "/System/Library/Sounds/Glass.aiff",
  batch_complete: "/System/Library/Sounds/Hero.aiff",
  error: "/System/Library/Sounds/Basso.aiff",
  thread_synthesis_complete: "/System/Library/Sounds/Purr.aiff"
};
// src/lib/notifications/config.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { join as join2 } from "path";
function getNotificationsConfigPath(repoRoot) {
  return join2(repoRoot, "work", "notifications.json");
}
function getDefaultNotificationsConfig() {
  return {
    enabled: true,
    providers: {
      sound: {
        enabled: true,
        volume: 1
      },
      notification_center: {
        enabled: true
      },
      terminal_notifier: {
        enabled: false,
        click_action: "none"
      },
      tts: {
        enabled: false
      }
    },
    events: {
      thread_complete: true,
      batch_complete: true,
      error: true,
      synthesis_complete: true
    }
  };
}
function loadNotificationsConfig(repoRoot) {
  const configPath = getNotificationsConfigPath(repoRoot);
  const defaults = getDefaultNotificationsConfig();
  if (!existsSync2(configPath)) {
    return defaults;
  }
  try {
    const content = readFileSync2(configPath, "utf-8");
    const loaded = JSON.parse(content);
    return {
      enabled: loaded.enabled ?? defaults.enabled,
      providers: {
        sound: {
          enabled: loaded.providers?.sound?.enabled ?? defaults.providers.sound.enabled,
          volume: loaded.providers?.sound?.volume ?? defaults.providers.sound.volume
        },
        notification_center: {
          enabled: loaded.providers?.notification_center?.enabled ?? defaults.providers.notification_center.enabled
        },
        terminal_notifier: {
          enabled: loaded.providers?.terminal_notifier?.enabled ?? defaults.providers.terminal_notifier.enabled,
          click_action: loaded.providers?.terminal_notifier?.click_action ?? defaults.providers.terminal_notifier.click_action
        },
        tts: {
          enabled: loaded.providers?.tts?.enabled ?? defaults.providers.tts.enabled,
          voice: loaded.providers?.tts?.voice ?? defaults.providers.tts.voice
        }
      },
      events: {
        thread_complete: loaded.events?.thread_complete ?? defaults.events.thread_complete,
        batch_complete: loaded.events?.batch_complete ?? defaults.events.batch_complete,
        error: loaded.events?.error ?? defaults.events.error,
        synthesis_complete: loaded.events?.synthesis_complete ?? defaults.events.synthesis_complete
      }
    };
  } catch {
    return defaults;
  }
}
// src/lib/notifications/providers/macos-sound.ts
import { spawn } from "child_process";
import { existsSync as existsSync3 } from "fs";
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
    if (!existsSync3(soundPath)) {
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
    if (customPath && existsSync3(customPath)) {
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
// src/lib/notifications/manager.ts
class NotificationManager {
  providers = [];
  legacyConfig;
  workstreamConfig = null;
  repoRoot;
  constructor(options) {
    if (options && "repoRoot" in options) {
      const opts = options;
      this.repoRoot = opts.repoRoot;
      this.legacyConfig = opts.config ?? loadConfig();
      if (this.repoRoot) {
        this.workstreamConfig = loadNotificationsConfig(this.repoRoot);
      }
    } else {
      this.legacyConfig = options ?? loadConfig();
    }
    this.initializeProviders();
  }
  initializeProviders() {
    if (this.workstreamConfig) {
      this.initializeFromWorkstreamConfig();
    } else {
      this.initializeFromLegacyConfig();
    }
  }
  initializeFromWorkstreamConfig() {
    const config = this.workstreamConfig;
    const providers = config.providers;
    if (providers.sound?.enabled) {
      this.providers.push(new MacOSSoundProvider({
        enabled: true,
        sounds: this.legacyConfig.sounds
      }));
    }
    if (providers.notification_center?.enabled) {
      this.providers.push(new MacOSNotificationCenterProvider({
        enabled: true
      }));
    }
    if (providers.terminal_notifier?.enabled) {
      this.providers.push(new TerminalNotifierProvider({
        enabled: true,
        click_action: providers.terminal_notifier.click_action
      }));
    }
    if (this.legacyConfig.external_api?.enabled) {
      this.providers.push(new ExternalApiProvider(this.legacyConfig.external_api));
    }
  }
  initializeFromLegacyConfig() {
    this.providers.push(new MacOSSoundProvider(this.legacyConfig));
    if (this.legacyConfig.external_api) {
      this.providers.push(new ExternalApiProvider(this.legacyConfig.external_api));
    }
  }
  addProvider(provider) {
    this.providers.push(provider);
  }
  removeProvider(name) {
    this.providers = this.providers.filter((p) => p.name !== name);
  }
  getProviders() {
    return [...this.providers];
  }
  playNotification(event, metadata) {
    if (this.workstreamConfig) {
      if (this.workstreamConfig.enabled === false) {
        return;
      }
    } else {
      if (this.legacyConfig.enabled === false) {
        return;
      }
    }
    if (this.workstreamConfig && !this.isEventEnabled(event)) {
      return;
    }
    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        provider.playNotification(event, metadata);
      }
    }
  }
  isEventEnabled(event) {
    if (!this.workstreamConfig) {
      return true;
    }
    const events = this.workstreamConfig.events;
    switch (event) {
      case "thread_complete":
        return events.thread_complete !== false;
      case "batch_complete":
        return events.batch_complete !== false;
      case "error":
        return events.error !== false;
      case "thread_synthesis_complete":
        return events.synthesis_complete !== false;
      default:
        return true;
    }
  }
  playSynthesisComplete(threadId, synthesisOutput) {
    this.playNotification("thread_synthesis_complete", {
      threadId,
      synthesisOutput
    });
  }
}
var defaultManager = null;
function getNotificationManager() {
  if (!defaultManager) {
    defaultManager = new NotificationManager;
  }
  return defaultManager;
}
function resetNotificationManager() {
  defaultManager = null;
}
function playNotification(event, metadata) {
  getNotificationManager().playNotification(event, metadata);
}
// src/lib/notifications/tracker.ts
class NotificationTracker {
  notifiedThreadIds = new Set;
  errorNotifiedThreadIds = new Set;
  synthesisNotifiedThreadIds = new Set;
  batchCompleteNotified = false;
  manager = null;
  constructor(options) {
    if (options?.repoRoot) {
      this.manager = new NotificationManager({ repoRoot: options.repoRoot });
    }
  }
  play(event, metadata) {
    if (this.manager) {
      this.manager.playNotification(event, metadata);
    } else {
      playNotification(event, metadata);
    }
  }
  hasThreadCompleteNotified(threadId) {
    return this.notifiedThreadIds.has(threadId);
  }
  markThreadCompleteNotified(threadId) {
    this.notifiedThreadIds.add(threadId);
  }
  hasErrorNotified(threadId) {
    return this.errorNotifiedThreadIds.has(threadId);
  }
  markErrorNotified(threadId) {
    this.errorNotifiedThreadIds.add(threadId);
  }
  hasSynthesisCompleteNotified(threadId) {
    return this.synthesisNotifiedThreadIds.has(threadId);
  }
  markSynthesisCompleteNotified(threadId) {
    this.synthesisNotifiedThreadIds.add(threadId);
  }
  hasBatchCompleteNotified() {
    return this.batchCompleteNotified;
  }
  markBatchCompleteNotified() {
    this.batchCompleteNotified = true;
  }
  playThreadComplete(threadId) {
    if (this.hasThreadCompleteNotified(threadId)) {
      return false;
    }
    this.markThreadCompleteNotified(threadId);
    this.play("thread_complete");
    return true;
  }
  playError(threadId) {
    if (this.hasErrorNotified(threadId)) {
      return false;
    }
    this.markErrorNotified(threadId);
    this.play("error");
    return true;
  }
  playBatchComplete() {
    if (this.hasBatchCompleteNotified()) {
      return false;
    }
    this.markBatchCompleteNotified();
    this.play("batch_complete");
    return true;
  }
  playSynthesisComplete(threadId, synthesisOutput) {
    if (this.hasSynthesisCompleteNotified(threadId)) {
      return false;
    }
    this.markSynthesisCompleteNotified(threadId);
    this.play("thread_synthesis_complete", {
      threadId,
      synthesisOutput
    });
    return true;
  }
  reset() {
    this.notifiedThreadIds.clear();
    this.errorNotifiedThreadIds.clear();
    this.synthesisNotifiedThreadIds.clear();
    this.batchCompleteNotified = false;
  }
  getNotifiedThreadCount() {
    return this.notifiedThreadIds.size;
  }
  getErrorNotifiedThreadCount() {
    return this.errorNotifiedThreadIds.size;
  }
  getSynthesisNotifiedThreadCount() {
    return this.synthesisNotifiedThreadIds.size;
  }
}
export {
  resetNotificationManager,
  playNotification,
  loadNotificationsConfig,
  loadConfig,
  getNotificationsConfigPath,
  getNotificationManager,
  getDefaultNotificationsConfig,
  TerminalNotifierProvider,
  NotificationTracker,
  NotificationManager,
  MacOSSoundProvider,
  MacOSNotificationCenterProvider,
  ExternalApiProvider,
  DEFAULT_SOUNDS,
  CONFIG_PATH
};
