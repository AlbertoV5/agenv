/**
 * work init - Initialize workstream configuration in a repository
 */

import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { getRepoRoot, getWorkDir, getIndexPath } from "../lib/repo.ts"
import { getOrCreateIndex, saveIndex } from "../lib/index.ts"
import { getAgentsYamlPath } from "../lib/agents-yaml.ts"
import { saveGitHubConfig, getGitHubConfigPath } from "../lib/github/config.ts"
import { DEFAULT_GITHUB_CONFIG } from "../lib/github/types.ts"
import {
  getDefaultNotificationsConfig,
  getNotificationsConfigPath,
} from "../lib/notifications/config.ts"

const DEFAULT_AGENTS_YAML = `agents:
  - name: default
    description: General-purpose implementation agent.
    best_for: Standard development tasks.
    models:
      - anthropic/claude-sonnet-4-5
      - openrouter/anthropic/claude-sonnet-4.5

  - name: frontend-speedster
    description: Very efficient and effective frontend coder.
    best_for: Straight-forward frontend tasks.
    models:
      - openrouter/google/gemini-3-flash-preview

  - name: systems-engineer
    description: Good for complex multi-faceted work.
    best_for: Architecture, complex systems, solving engineering problems.
    models:
      - anthropic/claude-opus-4-5
      - openrouter/anthropic/claude-opus-4.5

  - name: code-reviewer
    description: Specialized on code analysis.
    best_for: Debugging, testing, code reviews.
    models:
      - openrouter/openai/gpt-5.2-codex

  - name: documentation-minimalist
    description: Model that creates short and sweet docs.
    best_for: Documentation, reviews.
    models:
      - openrouter/google/gemini-3-pro-preview
`

function printHelp(): void {
  console.log(`
Usage: work init [options]

Initialize work/ directory with default configuration files.

Options:
  --force       Overwrite existing configuration files
  --help, -h    Show this help message
`)
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2)
  const force = args.includes("--force")

  const repoRootIdx = args.indexOf("--repo-root")
  let repoRootArg: string | undefined
  if (repoRootIdx !== -1 && repoRootIdx + 1 < args.length) {
    repoRootArg = args[repoRootIdx + 1]
  }

  if (args.includes("--help") || args.includes("-h")) {
    printHelp()
    return
  }

  try {
    const repoRoot = getRepoRoot(repoRootArg)
    const workDir = getWorkDir(repoRoot)

    if (!existsSync(workDir)) {
      console.log(`Creating ${workDir}/...`)
      mkdirSync(workDir, { recursive: true })
    }

    // 1. Initialize github.json
    const githubConfigPath = getGitHubConfigPath(repoRoot)
    if (!existsSync(githubConfigPath) || force) {
      console.log(
        `${force && existsSync(githubConfigPath) ? "Overwriting" : "Creating"} github.json (disabled by default)...`,
      )
      await saveGitHubConfig(repoRoot, DEFAULT_GITHUB_CONFIG)
    } else {
      console.log("github.json already exists, skipping.")
    }

    // 2. Initialize index.json
    const indexPath = getIndexPath(repoRoot)
    if (!existsSync(indexPath) || force) {
      console.log(
        `${force && existsSync(indexPath) ? "Overwriting" : "Initializing"} index.json...`,
      )
      const index = getOrCreateIndex(repoRoot)
      saveIndex(repoRoot, index)
    } else {
      console.log("index.json already exists, skipping.")
    }

    // 3. Initialize agents.yaml
    const agentsPath = getAgentsYamlPath(repoRoot)
    if (!existsSync(agentsPath) || force) {
      console.log(
        `${force && existsSync(agentsPath) ? "Overwriting" : "Initializing"} agents.yaml...`,
      )
      writeFileSync(agentsPath, DEFAULT_AGENTS_YAML, "utf-8")
    } else {
      console.log("agents.yaml already exists, skipping.")
    }

    // 4. Initialize notifications.json
    const notificationsPath = getNotificationsConfigPath(repoRoot)
    if (!existsSync(notificationsPath) || force) {
      console.log(
        `${
          force && existsSync(notificationsPath)
            ? "Overwriting"
            : "Initializing"
        } notifications.json...`,
      )
      const defaultConfig = getDefaultNotificationsConfig()
      writeFileSync(
        notificationsPath,
        JSON.stringify(defaultConfig, null, 2),
        "utf-8",
      )
    } else {
      console.log("notifications.json already exists, skipping.")
    }

    console.log("\nInitialization complete.")
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  }
}
