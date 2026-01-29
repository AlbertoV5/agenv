import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/lib/repo.ts
import { existsSync } from "fs";
import { join, dirname, resolve } from "path";
function findRepoRoot(startPath) {
  let current = resolve(startPath || process.cwd());
  const root = dirname(current);
  while (current !== root) {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current)
      break;
    current = parent;
  }
  if (existsSync(join(current, ".git"))) {
    return current;
  }
  return null;
}
function getRepoRoot(startPath) {
  const root = findRepoRoot(startPath);
  if (!root) {
    throw new Error("Not in a git repository. Run this command from within a git repository, " + "or specify --repo-root explicitly.");
  }
  return root;
}

// src/lib/notifications/config.ts
import { existsSync as existsSync2, readFileSync } from "fs";
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

// src/cli/notifications.ts
function printHelp() {
  console.log(`
work notifications - Show notification configuration

Usage:
  work notifications                    # Show configuration
  work notifications --json             # Output as JSON

Options:
  --repo-root, -r    Repository root (auto-detected if omitted)
  --json, -j         Output as JSON for machine-readable format
  --help, -h         Show this help message
  `);
}
function parseCliArgs(argv) {
  const args = argv.slice(2);
  const parsed = { json: false };
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value");
          return null;
        }
        parsed.repoRoot = next;
        i++;
        break;
      case "--json":
      case "-j":
        parsed.json = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }
  return parsed;
}
function formatOutput(config, path) {
  console.log("Notification Configuration");
  console.log("==========================");
  console.log(`Global Status: ${config.enabled ? "Enabled" : "Disabled"}`);
  console.log(`Config File:   ${path}`);
  console.log("");
  console.log("Providers:");
  const providers = config.providers;
  if (providers.sound) {
    console.log(`- Sound:             ${providers.sound.enabled ? "Enabled" : "Disabled"}`);
  }
  if (providers.notification_center) {
    console.log(`- Notification Center: ${providers.notification_center.enabled ? "Enabled" : "Disabled"}`);
  }
  if (providers.terminal_notifier) {
    console.log(`- Terminal Notifier: ${providers.terminal_notifier.enabled ? "Enabled" : "Disabled"}`);
  }
  if (providers.tts) {
    console.log(`- Text-to-Speech:    ${providers.tts.enabled ? "Enabled" : "Disabled"}`);
  }
  console.log("");
  console.log("Events:");
  const events = config.events;
  console.log(`- Thread Complete:    ${events.thread_complete ? "On" : "Off"}`);
  console.log(`- Batch Complete:     ${events.batch_complete ? "On" : "Off"}`);
  console.log(`- Synthesis Complete: ${events.synthesis_complete ? "On" : "Off"}`);
  console.log(`- Error:              ${events.error ? "On" : "Off"}`);
}
function main(argv = process.argv) {
  const cliArgs = parseCliArgs(argv);
  if (!cliArgs) {
    console.error(`
Run with --help for usage information.`);
    process.exit(1);
  }
  let repoRoot;
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const config = loadNotificationsConfig(repoRoot);
  const configPath = getNotificationsConfigPath(repoRoot);
  if (cliArgs.json) {
    console.log(JSON.stringify(config, null, 2));
  } else {
    formatOutput(config, configPath);
  }
}
if (__require.main == __require.module) {
  main();
}
export {
  main
};
