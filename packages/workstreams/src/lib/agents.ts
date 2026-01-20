/**
 * AGENTS.md parser and manager
 *
 * Handles the AGENTS.md configuration file at work/AGENTS.md
 * which defines available agents with their descriptions and models.
 *
 * Agent-to-task assignments are stored in tasks.json (Task.assigned_agent),
 * not in AGENTS.md.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { Lexer, type Tokens } from "marked"
import type { AgentDefinition, AgentsConfig } from "./types.ts"
import { getWorkDir } from "./repo.ts"

/**
 * Get the AGENTS.md file path
 */
export function getAgentsMdPath(repoRoot: string): string {
  return join(getWorkDir(repoRoot), "AGENTS.md")
}

/**
 * Extract field value from text following a bold label pattern
 * e.g., "**Description:** Some text here" -> "Some text here"
 */
function extractField(text: string, fieldName: string): string | null {
  const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, "i")
  const match = text.match(pattern)
  return match && match[1] ? match[1].trim() : null
}

/**
 * Parse AGENTS.md content to extract AgentsConfig
 *
 * Expected format:
 * # Agents
 *
 * ## Agent Definitions
 *
 * ### agent-name
 * **Description:** ...
 * **Best for:** ...
 * **Model:** ...
 */
export function parseAgentsMd(content: string): { config: AgentsConfig | null; errors: string[] } {
  const lexer = new Lexer()
  const tokens = lexer.lex(content)
  const errors: string[] = []

  const agents: AgentDefinition[] = []

  let inAgentDefinitions = false
  let currentAgent: Partial<AgentDefinition> | null = null

  for (const token of tokens) {
    // Detect "Agent Definitions" section by H2 heading
    if (token.type === "heading") {
      const heading = token as Tokens.Heading

      if (heading.depth === 2) {
        const text = heading.text.toLowerCase()
        if (text.includes("agent definitions")) {
          inAgentDefinitions = true
        } else {
          // Left the agent definitions section
          if (inAgentDefinitions && currentAgent?.name) {
            // Save any pending agent
            if (currentAgent.description && currentAgent.bestFor && currentAgent.model) {
              agents.push(currentAgent as AgentDefinition)
            }
            currentAgent = null
          }
          inAgentDefinitions = false
        }
      }

      // H3 heading = new agent name
      if (heading.depth === 3 && inAgentDefinitions) {
        // Save previous agent if complete
        if (currentAgent?.name && currentAgent.description && currentAgent.bestFor && currentAgent.model) {
          agents.push(currentAgent as AgentDefinition)
        }
        // Start new agent
        currentAgent = { name: heading.text.trim() }
      }
    }

    // Parse paragraph content for agent fields
    if (token.type === "paragraph" && inAgentDefinitions && currentAgent) {
      const para = token as Tokens.Paragraph
      const text = para.raw || para.text

      // Try to extract each field from the paragraph
      const description = extractField(text, "Description")
      const bestFor = extractField(text, "Best for")
      const model = extractField(text, "Model")

      if (description) currentAgent.description = description
      if (bestFor) currentAgent.bestFor = bestFor
      if (model) currentAgent.model = model
    }
  }

  // Don't forget the last agent
  if (currentAgent?.name && currentAgent.description && currentAgent.bestFor && currentAgent.model) {
    agents.push(currentAgent as AgentDefinition)
  }

  const config: AgentsConfig = { agents }
  return { config, errors }
}

/**
 * Generate AGENTS.md content from AgentsConfig
 */
export function generateAgentsMd(config: AgentsConfig): string {
  const lines: string[] = []

  lines.push("# Agents")
  lines.push("")
  lines.push("## Agent Definitions")
  lines.push("")

  for (const agent of config.agents) {
    lines.push(`### ${agent.name}`)
    lines.push(`**Description:** ${agent.description}`)
    lines.push(`**Best for:** ${agent.bestFor}`)
    lines.push(`**Model:** ${agent.model}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Load AgentsConfig from work/AGENTS.md
 * Returns null if the file doesn't exist
 */
export function getAgentsConfig(repoRoot: string): AgentsConfig | null {
  const path = getAgentsMdPath(repoRoot)
  if (!existsSync(path)) {
    return null
  }

  const content = readFileSync(path, "utf-8")
  const { config, errors } = parseAgentsMd(content)

  if (errors.length > 0) {
    console.warn("Warnings parsing AGENTS.md:", errors.join(", "))
  }

  return config
}

/**
 * Save AgentsConfig to work/AGENTS.md
 */
export function saveAgentsConfig(repoRoot: string, config: AgentsConfig): void {
  const path = getAgentsMdPath(repoRoot)
  const dir = dirname(path)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const content = generateAgentsMd(config)
  writeFileSync(path, content, "utf-8")
}

/**
 * List all available agents
 */
export function listAgents(config: AgentsConfig): AgentDefinition[] {
  return config.agents
}

/**
 * Get an agent by name
 */
export function getAgent(config: AgentsConfig, name: string): AgentDefinition | null {
  return config.agents.find((a) => a.name === name) || null
}

/**
 * Add a new agent definition (or update existing)
 */
export function addAgent(repoRoot: string, agent: AgentDefinition): void {
  let config = getAgentsConfig(repoRoot)

  if (!config) {
    config = { agents: [] }
  }

  // Check if agent already exists
  const existingIdx = config.agents.findIndex((a) => a.name === agent.name)
  if (existingIdx !== -1) {
    // Update existing
    config.agents[existingIdx] = agent
  } else {
    config.agents.push(agent)
  }

  saveAgentsConfig(repoRoot, config)
}

/**
 * Remove an agent definition
 */
export function removeAgent(repoRoot: string, agentName: string): boolean {
  const config = getAgentsConfig(repoRoot)
  if (!config) return false

  const idx = config.agents.findIndex((a) => a.name === agentName)
  if (idx === -1) return false

  config.agents.splice(idx, 1)
  saveAgentsConfig(repoRoot, config)
  return true
}
