/**
 * Synthesis configuration loader
 *
 * Handles loading and providing defaults for the work/synthesis.json config file.
 * This configuration is per-repository and controls synthesis agent behavior
 * during workstream execution.
 */

import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { SynthesisConfig } from "./types"

/**
 * Get the path to the synthesis config file
 * @param repoRoot - The root directory of the repository
 * @returns Path to work/synthesis.json
 */
export function getSynthesisConfigPath(repoRoot: string): string {
  return join(repoRoot, "work", "synthesis.json")
}

/**
 * Get the default synthesis configuration
 * Synthesis is disabled by default for safety - must be explicitly enabled
 *
 * @returns Default SynthesisConfig with synthesis disabled
 */
export function getDefaultSynthesisConfig(): SynthesisConfig {
  return {
    enabled: false,
  }
}

/**
 * Load synthesis configuration from work/synthesis.json
 * Returns default configuration if file doesn't exist or is invalid
 *
 * @param repoRoot - The root directory of the repository
 * @returns SynthesisConfig - merged with defaults for any missing fields
 */
export function loadSynthesisConfig(repoRoot: string): SynthesisConfig {
  const configPath = getSynthesisConfigPath(repoRoot)
  const defaults = getDefaultSynthesisConfig()

  if (!existsSync(configPath)) {
    return defaults
  }

  try {
    const content = readFileSync(configPath, "utf-8")
    const loaded = JSON.parse(content) as Partial<SynthesisConfig>

    // Merge with defaults to ensure all required fields exist
    return {
      enabled: loaded.enabled ?? defaults.enabled,
      agent: loaded.agent,
      output: loaded.output
        ? {
            store_in_threads: loaded.output.store_in_threads,
          }
        : undefined,
    }
  } catch (error) {
    // Invalid JSON or read error - log warning and return default config
    console.warn(
      `[synthesis] Warning: Failed to parse ${configPath}, using defaults. Error: ${error instanceof Error ? error.message : String(error)}`
    )
    return defaults
  }
}

/**
 * Check if synthesis agents are enabled for the given repository
 *
 * @param repoRoot - The root directory of the repository
 * @returns true if synthesis is enabled in the config, false otherwise
 */
export function isSynthesisEnabled(repoRoot: string): boolean {
  const config = loadSynthesisConfig(repoRoot)
  return config.enabled
}

/**
 * Get the synthesis agent override if configured
 *
 * @param repoRoot - The root directory of the repository
 * @returns The agent name override, or undefined if not configured
 */
export function getSynthesisAgentOverride(repoRoot: string): string | undefined {
  const config = loadSynthesisConfig(repoRoot)
  return config.agent
}
