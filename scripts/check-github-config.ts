#!/usr/bin/env bun
/**
 * Test GitHub configuration management
 * Usage: bun run ./scripts/check-github-config.ts
 */

import {
  getGitHubConfigPath,
  loadGitHubConfig,
  saveGitHubConfig,
  isGitHubEnabled,
  detectRepository,
  enableGitHub,
  disableGitHub,
} from "../packages/workstreams/src/lib/github/config.ts"
import { DEFAULT_GITHUB_CONFIG } from "../packages/workstreams/src/lib/github/types.ts"
import { existsSync } from "node:fs"

const repoRoot = process.cwd()

async function main() {
  console.log("=== GitHub Configuration Test ===\n")

  // Show config path
  const configPath = getGitHubConfigPath(repoRoot)
  console.log("Config path:", configPath)
  console.log("Config exists:", existsSync(configPath))

  // Detect repository
  console.log("\n--- Repository Detection ---")
  const repoInfo = await detectRepository(repoRoot)
  if (repoInfo) {
    console.log(`Detected: ${repoInfo.owner}/${repoInfo.repo}`)
  } else {
    console.log("Could not detect repository from git remote")
  }

  // Load current config
  console.log("\n--- Current Configuration ---")
  const config = await loadGitHubConfig(repoRoot)
  console.log(JSON.stringify(config, null, 2))

  // Check if enabled
  const enabled = await isGitHubEnabled(repoRoot)
  console.log("\n--- Status ---")
  console.log("GitHub integration enabled:", enabled)

  // Interactive test
  const arg = process.argv[2]
  if (arg === "--enable") {
    console.log("\n--- Enabling GitHub Integration ---")
    try {
      await enableGitHub(repoRoot)
      const newConfig = await loadGitHubConfig(repoRoot)
      console.log("✅ Enabled!")
      console.log(JSON.stringify(newConfig, null, 2))
    } catch (e) {
      console.log("❌ Failed:", (e as Error).message)
    }
  } else if (arg === "--disable") {
    console.log("\n--- Disabling GitHub Integration ---")
    await disableGitHub(repoRoot)
    console.log("✅ Disabled!")
  } else if (arg === "--reset") {
    console.log("\n--- Resetting to Default ---")
    await saveGitHubConfig(repoRoot, DEFAULT_GITHUB_CONFIG)
    console.log("✅ Reset to default config")
  } else {
    console.log("\n--- Commands ---")
    console.log("  --enable   Enable GitHub integration")
    console.log("  --disable  Disable GitHub integration")
    console.log("  --reset    Reset to default config")
  }
}

main().catch(console.error)
