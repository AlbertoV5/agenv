// src/lib/notifications/config.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
function getNotificationsConfigPath(repoRoot) {
  return join(repoRoot, "work", "notifications.json");
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
  if (!existsSync(configPath)) {
    return defaults;
  }
  try {
    const content = readFileSync(configPath, "utf-8");
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
export {
  loadNotificationsConfig,
  getNotificationsConfigPath,
  getDefaultNotificationsConfig
};
