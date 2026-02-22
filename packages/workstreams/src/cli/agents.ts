/**
 * CLI: List Agent Definitions
 *
 * List agent definitions from work/agents.yaml.
 * Agent definitions describe available agents, their specializations, and models.
 * 
 * Output is designed for planner agents to understand available agent capabilities.
 */

import { getRepoRoot } from "../lib/repo.ts"
import {
  loadAgentsConfig,
  getAgentsYamlPath,
} from "../lib/agents-yaml.ts"
import type { AgentDefinitionYaml } from "../lib/types.ts"

interface AgentsCliArgs {
  repoRoot?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work agents - List agent definitions

Usage:
  work agents                           # List all agents
  work agents --json                    # Output as JSON

Options:
  --repo-root, -r    Repository root (auto-detected if omitted)
  --json, -j         Output as JSON for machine-readable format
  --help, -h         Show this help message

Description:
  Agents are defined in work/agents.yaml and can be assigned to threads
  for workstream execution. Each agent has a name, description of its
  specialization, use cases it's best for, and a list of models to use.

  The output format is designed for planner agents to understand
  what agents are available and their capabilities.

Examples:
  # List all defined agents
  work agents

  # Get JSON output for programmatic use
  work agents --json
`)
}

function parseCliArgs(argv: string[]): AgentsCliArgs | null {
  const args = argv.slice(2)
  const parsed: AgentsCliArgs = { json: false }

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
 * Format agent output for CLI display
 * Note: Models are intentionally excluded to avoid biasing planner agents
 */
function formatAgentOutput(agents: AgentDefinitionYaml[]): void {
  console.log("Available Agents:")
  console.log("")

  for (const agent of agents) {
    console.log(`- ${agent.name}`)
    console.log(`  Description: ${agent.description}`)
    console.log(`  Best for: ${agent.best_for}`)
    console.log("")
  }
}

/**
 * Format agent output as JSON
 * Note: Models are intentionally excluded to avoid biasing planner agents
 */
function formatAgentJson(agents: AgentDefinitionYaml[]): void {
  const output = {
    agents: agents.map((agent) => ({
      name: agent.name,
      description: agent.description,
      best_for: agent.best_for,
    })),
  }
  console.log(JSON.stringify(output, null, 2))
}

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

  // Load agents from agents.yaml
  const config = loadAgentsConfig(repoRoot)

  if (!config || config.agents.length === 0) {
    if (cliArgs.json) {
      console.log(JSON.stringify({ agents: [] }, null, 2))
    } else {
      const agentsPath = getAgentsYamlPath(repoRoot)
      console.log("No agents defined.")
      console.log("")
      console.log("To define agents, create or edit the agents.yaml file:")
      console.log(`  ${agentsPath}`)
      console.log("")
      console.log("Example agents.yaml:")
      console.log(`
agents:
  - name: backend-expert
    description: Specializes in database schema design and API development
    best_for: Database setup, migration scripts, API endpoints
    models:
      - anthropic/claude-sonnet-4
      - anthropic/claude-opus
`)
      console.log("Or run 'work init' to create a default configuration.")
    }
    return
  }

  // Output agents
  if (cliArgs.json) {
    formatAgentJson(config.agents)
  } else {
    formatAgentOutput(config.agents)
    console.log(`Config file: ${getAgentsYamlPath(repoRoot)}`)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
