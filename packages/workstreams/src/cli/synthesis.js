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

// src/lib/synthesis/config.ts
import { existsSync as existsSync2, readFileSync } from "fs";
import { join as join2 } from "path";
function getSynthesisConfigPath(repoRoot) {
  return join2(repoRoot, "work", "synthesis.json");
}
function getDefaultSynthesisConfig() {
  return {
    enabled: false
  };
}
function loadSynthesisConfig(repoRoot) {
  const configPath = getSynthesisConfigPath(repoRoot);
  const defaults = getDefaultSynthesisConfig();
  if (!existsSync2(configPath)) {
    return defaults;
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    const loaded = JSON.parse(content);
    return {
      enabled: loaded.enabled ?? defaults.enabled,
      agent: loaded.agent,
      output: loaded.output ? {
        store_in_threads: loaded.output.store_in_threads
      } : undefined
    };
  } catch (error) {
    console.warn(`[synthesis] Warning: Failed to parse ${configPath}, using defaults. Error: ${error instanceof Error ? error.message : String(error)}`);
    return defaults;
  }
}

// src/cli/synthesis.ts
function printHelp() {
  console.log(`
work synthesis - Show synthesis configuration

Usage:
  work synthesis                    # Show configuration
  work synthesis --json             # Output as JSON

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
  console.log("Synthesis Configuration");
  console.log("=======================");
  console.log(`Status:      ${config.enabled ? "Enabled" : "Disabled"}`);
  console.log(`Config File: ${path}`);
  console.log("");
  if (config.agent) {
    console.log(`Agent Override: ${config.agent}`);
  } else {
    console.log("Agent Override: (none - using default)");
  }
  console.log("");
  console.log("Output Settings:");
  if (config.output) {
    console.log(`- Store in threads: ${config.output.store_in_threads ? "Yes" : "No"}`);
  } else {
    console.log("- Store in threads: Yes (default)");
  }
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
  const config = loadSynthesisConfig(repoRoot);
  const configPath = getSynthesisConfigPath(repoRoot);
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
