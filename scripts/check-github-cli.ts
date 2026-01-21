#!/usr/bin/env bun
/**
 * Test GitHub CLI commands
 * Usage: bun run ./scripts/check-github-cli.ts
 *
 * Tests the `work github` CLI commands without side effects
 */

import { execSync, spawnSync } from "node:child_process"

const repoRoot = process.cwd()

function run(cmd: string, expectSuccess = true): { stdout: string; stderr: string; success: boolean } {
  try {
    const result = spawnSync("bash", ["-c", cmd], {
      cwd: repoRoot,
      encoding: "utf-8",
      env: { ...process.env },
    })
    return {
      stdout: result.stdout?.trim() || "",
      stderr: result.stderr?.trim() || "",
      success: result.status === 0,
    }
  } catch (e) {
    return {
      stdout: "",
      stderr: (e as Error).message,
      success: false,
    }
  }
}

function testCommand(name: string, cmd: string, expectSuccess = true): void {
  process.stdout.write(`  ${name}... `)
  const result = run(cmd, expectSuccess)

  if (result.success === expectSuccess) {
    console.log("✅")
  } else {
    console.log("❌")
    if (result.stderr) {
      console.log(`    stderr: ${result.stderr.slice(0, 100)}`)
    }
  }
}

async function main() {
  console.log("=== GitHub CLI Commands Test ===\n")

  // Check if work command exists
  console.log("--- Prerequisites ---")
  const workCheck = run("which work || command -v work")
  if (!workCheck.success && !workCheck.stdout) {
    console.log("❌ 'work' command not found in PATH")
    console.log("   Make sure packages/workstreams is linked or in PATH")
    process.exit(1)
  }
  console.log(`✅ work command found: ${workCheck.stdout || "via bun"}`)

  // Test help commands (should always work)
  console.log("\n--- Help Commands (read-only) ---")
  testCommand("work github --help", "work github --help")
  testCommand("work github status --help", "work github status --help")
  testCommand("work github enable --help", "work github enable --help")
  testCommand("work github disable --help", "work github disable --help")
  testCommand("work github create-branch --help", "work github create-branch --help")
  testCommand("work github create-issues --help", "work github create-issues --help")
  testCommand("work github sync --help", "work github sync --help")

  // Test status command (read-only)
  console.log("\n--- Status Command (read-only) ---")
  const statusResult = run("work github status")
  if (statusResult.success) {
    console.log("✅ work github status")
    console.log("")
    // Print relevant lines
    const lines = statusResult.stdout.split("\n")
    for (const line of lines) {
      if (line.includes("Enabled:") || line.includes("Repository:") || line.includes("Valid:")) {
        console.log(`    ${line.trim()}`)
      }
    }
  } else {
    console.log("❌ work github status")
    console.log(`    ${statusResult.stderr}`)
  }

  // Check current workstream
  console.log("\n--- Current Workstream ---")
  const currentResult = run("work current")
  if (currentResult.success && currentResult.stdout) {
    console.log(`✅ Current workstream: ${currentResult.stdout}`)
  } else {
    console.log("⚠️  No current workstream set")
  }

  // Parse command line args
  const arg = process.argv[2]

  if (arg === "--enable") {
    console.log("\n--- Enabling GitHub Integration ---")
    const result = run("work github enable")
    if (result.success) {
      console.log("✅ GitHub integration enabled")
      console.log(result.stdout)
    } else {
      console.log("❌ Failed to enable")
      console.log(result.stderr)
    }
  } else if (arg === "--disable") {
    console.log("\n--- Disabling GitHub Integration ---")
    const result = run("work github disable")
    if (result.success) {
      console.log("✅ GitHub integration disabled")
    } else {
      console.log("❌ Failed to disable")
      console.log(result.stderr)
    }
  } else if (arg === "--create-issues") {
    const filter = process.argv[3] // e.g., "--batch 01.01" or "--stage 1"
    const value = process.argv[4]

    console.log("\n--- Creating Issues (DRY RUN CHECK) ---")

    // First check what would be created
    let cmd = "work github create-issues --json"
    if (filter === "--batch" && value) {
      cmd += ` --batch "${value}"`
    } else if (filter === "--stage" && value) {
      cmd += ` --stage ${value}`
    }

    console.log(`Command: ${cmd}`)
    console.log("")
    console.log("⚠️  This will create real GitHub issues!")
    console.log("   Press Ctrl+C within 5 seconds to cancel...")

    await new Promise(resolve => setTimeout(resolve, 5000))

    const result = run(cmd)
    if (result.success) {
      console.log("✅ Issues created")
      try {
        const json = JSON.parse(result.stdout)
        console.log(`   Created: ${json.created?.length || 0}`)
        console.log(`   Skipped: ${json.skipped?.length || 0}`)
        console.log(`   Failed: ${json.failed?.length || 0}`)
        if (json.created?.length > 0) {
          for (const item of json.created) {
            console.log(`   - [${item.threadKey}] ${item.issueUrl}`)
          }
        }
      } catch {
        console.log(result.stdout)
      }
    } else {
      console.log("❌ Failed")
      console.log(result.stderr || result.stdout)
    }
  } else if (arg === "--sync") {
    console.log("\n--- Syncing Issue States ---")
    const result = run("work github sync --json")
    if (result.success) {
      console.log("✅ Sync completed")
      try {
        const json = JSON.parse(result.stdout)
        console.log(`   Closed: ${json.closed?.length || 0}`)
        console.log(`   Unchanged: ${json.unchanged?.length || 0}`)
        console.log(`   Errors: ${json.errors?.length || 0}`)
      } catch {
        console.log(result.stdout)
      }
    } else {
      console.log("❌ Sync failed")
      console.log(result.stderr || result.stdout)
    }
  } else {
    console.log("\n--- Commands ---")
    console.log("  --enable           Run 'work github enable'")
    console.log("  --disable          Run 'work github disable'")
    console.log("  --create-issues    Create issues for all pending threads")
    console.log("  --create-issues --batch 01.01    Create issues for batch")
    console.log("  --create-issues --stage 1        Create issues for stage")
    console.log("  --sync             Sync issue states")
    console.log("")
    console.log("Note: create-issues and sync have a 5-second delay before execution")
  }
}

main().catch(console.error)
