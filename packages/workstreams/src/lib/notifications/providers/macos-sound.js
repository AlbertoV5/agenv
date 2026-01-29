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
export {
  MacOSSoundProvider
};
