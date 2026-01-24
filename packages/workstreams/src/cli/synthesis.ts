/**
 * CLI: Show Synthesis Configuration
 *
 * Displays the current synthesis configuration and status.
 */

import { getRepoRoot } from "../lib/repo.ts"
import {
  loadSynthesisConfig,
  getSynthesisConfigPath,
} from "../lib/synthesis/config.ts"
import type { SynthesisConfig } from "../lib/synthesis/types.ts"

/**
 * Arguments for the synthesis CLI command
 */
interface SynthesisCliArgs {
  repoRoot?: string
  json: boolean
}

/**
 * Print help message for the synthesis command
 */
function printHelp(): void {
  console.log(`
work synthesis - Show synthesis configuration

Usage:
  work synthesis                    # Show configuration
  work synthesis --json             # Output as JSON

Options:
  --repo-root, -r    Repository root (auto-detected if omitted)
  --json, -j         Output as JSON for machine-readable format
  --help, -h         Show this help message
  `)
}

/**
 * Parse CLI arguments
 * @param argv - Process arguments
 * @returns Parsed arguments or null if validation fails
 */
function parseCliArgs(argv: string[]): SynthesisCliArgs | null {
  const args = argv.slice(2)
  const parsed: SynthesisCliArgs = { json: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed
}

/**
 * Format configuration output for human-readable display
 * @param config - The synthesis configuration object
 * @param path - Path to the configuration file
 */
function formatOutput(config: SynthesisConfig, path: string): void {
  console.log("Synthesis Configuration")
  console.log("=======================")
  console.log(`Status:      ${config.enabled ? "Enabled" : "Disabled"}`)
  console.log(`Config File: ${path}`)
  console.log("")

  if (config.agent) {
    console.log(`Agent Override: ${config.agent}`)
  } else {
    console.log("Agent Override: (none - using default)")
  }
  console.log("")

  console.log("Output Settings:")
  if (config.output) {
    console.log(`- Store in threads: ${config.output.store_in_threads ? "Yes" : "No"}`)
  } else {
    console.log("- Store in threads: Yes (default)")
  }
}

/**
 * Main entry point for the synthesis command
 * @param argv - Command line arguments
 */
export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const config = loadSynthesisConfig(repoRoot)
  const configPath = getSynthesisConfigPath(repoRoot)

  if (cliArgs.json) {
    console.log(JSON.stringify(config, null, 2))
  } else {
    formatOutput(config, configPath)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
