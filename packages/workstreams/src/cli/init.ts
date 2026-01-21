/**
 * work init - Initialize workstream configuration in a repository
 */

import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { getRepoRoot, getWorkDir, getIndexPath } from "../lib/repo.ts"
import { getOrCreateIndex, saveIndex } from "../lib/index.ts"
import { getAgentsMdPath } from "../lib/agents.ts"
import { getTestsMdPath } from "../lib/prompts.ts"

const DEFAULT_AGENTS_MD = `# Agents

## Agent Definitions

### default
**Description:** General-purpose implementation agent
**Best for:** Standard development tasks
**Model:** anthropic/claude-sonnet-4
`

const DEFAULT_TESTS_MD = `# Test Requirements

## General
- All changes must pass existing test suite
- New functionality requires tests

## Per-Stage
- (Add stage-specific test requirements here)
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

        // 1. Initialize index.json
        const indexPath = getIndexPath(repoRoot)
        if (!existsSync(indexPath) || force) {
            console.log(`${force && existsSync(indexPath) ? "Overwriting" : "Initializing"} index.json...`)
            const index = getOrCreateIndex(repoRoot)
            saveIndex(repoRoot, index)
        } else {
            console.log("index.json already exists, skipping.")
        }

        // 2. Initialize AGENTS.md
        const agentsPath = getAgentsMdPath(repoRoot)
        if (!existsSync(agentsPath) || force) {
            console.log(`${force && existsSync(agentsPath) ? "Overwriting" : "Initializing"} AGENTS.md...`)
            writeFileSync(agentsPath, DEFAULT_AGENTS_MD, "utf-8")
        } else {
            console.log("AGENTS.md already exists, skipping.")
        }

        // 3. Initialize TESTS.md
        const testsPath = getTestsMdPath(repoRoot)
        if (!existsSync(testsPath) || force) {
            console.log(`${force && existsSync(testsPath) ? "Overwriting" : "Initializing"} TESTS.md...`)
            writeFileSync(testsPath, DEFAULT_TESTS_MD, "utf-8")
        } else {
            console.log("TESTS.md already exists, skipping.")
        }

        console.log("\nInitialization complete.")
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    }
}
