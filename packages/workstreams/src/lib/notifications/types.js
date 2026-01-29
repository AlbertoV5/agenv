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
export {
  loadConfig,
  DEFAULT_SOUNDS,
  CONFIG_PATH
};
