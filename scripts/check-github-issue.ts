#!/usr/bin/env bun
/**
 * Test GitHub issue creation
 * Usage: bun run ./scripts/check-github-issue.ts [--create] [--close <number>]
 */

import { getGitHubAuth } from "../packages/workstreams/src/lib/github/auth.ts"
import { loadGitHubConfig } from "../packages/workstreams/src/lib/github/config.ts"
import { GitHubClient } from "../packages/workstreams/src/lib/github/client.ts"

const repoRoot = process.cwd()

async function main() {
  console.log("=== GitHub Issue Test ===\n")

  // Get auth
  const token = getGitHubAuth()
  if (!token) {
    console.log("❌ No GitHub authentication found!")
    process.exit(1)
  }
  console.log("✅ Authentication found")

  // Get config
  const config = await loadGitHubConfig(repoRoot)
  if (!config.owner || !config.repo) {
    console.log("❌ Repository not configured!")
    console.log("   Run: bun run ./scripts/check-github-config.ts --enable")
    process.exit(1)
  }
  console.log(`✅ Repository: ${config.owner}/${config.repo}`)

  // Create client
  const client = new GitHubClient(token, { owner: config.owner, repo: config.repo })

  // List recent issues with workstream labels
  console.log("\n--- Recent Workstream Issues ---")
  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/issues?state=all&per_page=10&labels=workstream:test`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "workstreams-test",
        },
      }
    )
    const issues = await response.json()

    if (!Array.isArray(issues) || issues.length === 0) {
      console.log("No workstream:test issues found")
    } else {
      for (const issue of issues) {
        const state = issue.state === "open" ? "🟢" : "🔴"
        console.log(`  ${state} #${issue.number}: ${issue.title}`)
        console.log(`     ${issue.html_url}`)
      }
    }
  } catch (e) {
    console.log("Could not list issues:", (e as Error).message)
  }

  // Parse command
  const arg = process.argv[2]

  if (arg === "--create") {
    console.log("\n--- Creating Test Issue ---")

    // Ensure test label exists first
    try {
      await client.ensureLabels([
        { name: "workstream:test", color: "7B68EE", description: "Test workstream label" },
      ])
    } catch {
      // Ignore label errors
    }

    try {
      const issue = await client.createIssue(
        "[01.01.01] Test Thread - workstream-test",
        `## Thread: Test Thread

**Workstream:** test
**Stage:** 01 - Test Stage
**Batch:** 01.01 - Test Batch
**Thread:** 01.01.01 - Test Thread

### Summary
This is a test issue created by the GitHub integration test script.

### Tasks
- [ ] Task 01.01.01.01: Test task 1
- [ ] Task 01.01.01.02: Test task 2

---
*Created by workstreams GitHub integration*`,
        ["workstream:test"]
      )
      console.log("✅ Issue created!")
      console.log(`   Number: #${issue.number}`)
      console.log(`   URL: ${issue.html_url}`)
    } catch (e) {
      console.log("❌ Failed:", (e as Error).message)
    }
  } else if (arg === "--close") {
    const issueNumber = parseInt(process.argv[3], 10)
    if (!issueNumber) {
      console.log("❌ Please provide issue number: --close <number>")
      process.exit(1)
    }

    console.log(`\n--- Closing Issue #${issueNumber} ---`)
    try {
      const issue = await client.closeIssue(issueNumber)
      console.log("✅ Issue closed!")
      console.log(`   URL: ${issue.html_url}`)
    } catch (e) {
      console.log("❌ Failed:", (e as Error).message)
    }
  } else if (arg === "--get") {
    const issueNumber = parseInt(process.argv[3], 10)
    if (!issueNumber) {
      console.log("❌ Please provide issue number: --get <number>")
      process.exit(1)
    }

    console.log(`\n--- Getting Issue #${issueNumber} ---`)
    try {
      const issue = await client.getIssue(issueNumber)
      console.log(JSON.stringify(issue, null, 2))
    } catch (e) {
      console.log("❌ Failed:", (e as Error).message)
    }
  } else {
    console.log("\n--- Commands ---")
    console.log("  --create         Create a test issue")
    console.log("  --close <num>    Close issue by number")
    console.log("  --get <num>      Get issue details")
  }
}

main().catch(console.error)
