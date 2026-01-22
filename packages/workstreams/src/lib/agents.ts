/**
 * Agent utilities
 *
 * This file contains utility functions for agent validation.
 *
 * @deprecated AGENTS.md support has been removed. Agent definitions are now
 * stored in agents.yaml. Use agents-yaml.ts for agent configuration.
 *
 * The following functions are kept for backwards compatibility but will
 * emit deprecation warnings:
 * - getAgentsConfig() - Use loadAgentsConfig() from agents-yaml.ts
 * - listAgents() - Use listAgentsYaml() from agents-yaml.ts
 * - getAgent() - Use getAgentYaml() from agents-yaml.ts
 */

import type { AgentDefinition, AgentsConfig } from "./types.ts"

/**
 * Validate that model follows provider/model format
 * e.g., "google/gemini-3-flash-preview", "anthropic/claude-sonnet-4"
 */
export function isValidModelFormat(model: string): boolean {
  return model.includes("/")
}

/**
 * @deprecated Use loadAgentsConfig() from agents-yaml.ts instead.
 * Returns null - AGENTS.md is no longer supported.
 */
export function getAgentsConfig(_repoRoot: string): AgentsConfig | null {
  console.warn(
    "DEPRECATED: getAgentsConfig() is deprecated. Use loadAgentsConfig() from agents-yaml.ts",
  )
  return null
}

/**
 * @deprecated Use listAgentsYaml() from agents-yaml.ts instead.
 * Returns an empty array.
 */
export function listAgents(_config: AgentsConfig): AgentDefinition[] {
  console.warn(
    "DEPRECATED: listAgents() is deprecated. Use listAgentsYaml() from agents-yaml.ts",
  )
  return []
}

/**
 * @deprecated Use getAgentYaml() from agents-yaml.ts instead.
 * Returns null.
 */
export function getAgent(
  _config: AgentsConfig,
  _name: string,
): AgentDefinition | null {
  console.warn(
    "DEPRECATED: getAgent() is deprecated. Use getAgentYaml() from agents-yaml.ts",
  )
  return null
}
