/**
 * CLI: Manage Agent Definitions
 *
 * List, add, and remove agent definitions in work/AGENTS.md.
 * Agent definitions describe available agents, their specializations, and models.
 */

import { getRepoRoot } from "../lib/repo.ts"
import {
  getAgentsConfig,
  addAgent,
  removeAgent,
  listAgents,
  getAgentsMdPath,
} from "../lib/agents.ts"
import type { AgentDefinition } from "../lib/types.ts"

interface AgentsCliArgs {
  repoRoot?: string
  add: boolean
  remove?: string
  name?: string
  description?: string
  bestFor?: string
  model?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work agents - Manage agent definitions

Usage:
  work agents                           # List all agents
  work agents --add --name <name> --description <desc> --best-for <uses> --model <model>
  work agents --remove <name>           # Remove an agent

Options:
  --repo-root, -r    Repository root (auto-detected if omitted)
  --add              Add a new agent definition
  --remove           Remove an agent by name
  --name             Agent name (required with --add)
  --description      Agent description (required with --add)
  --best-for         What the agent is best for (required with --add)
  --model            Model ID, e.g., claude-opus, claude-sonnet (required with --add)
  --json, -j         Output as JSON
  --help, -h         Show this help message

Description:
  Agents are defined in work/AGENTS.md and can be assigned to tasks
  for workstream execution. Each agent has a name, description of its
  specialization, use cases it's best for, and a model ID.

Examples:
  # List all defined agents
  work agents

  # Add a backend specialist
  work agents --add --name "backend-orm-expert" \\
    --description "Specializes in database schema design, ORM configuration, migrations" \\
    --best-for "Database setup, migration scripts, complex queries" \\
    --model "claude-opus"

  # Add a frontend specialist
  work agents --add --name "frontend-styling" \\
    --description "Focuses on CSS architecture, component styling, design systems" \\
    --best-for "UI polish, style refactors, responsive fixes" \\
    --model "claude-sonnet"

  # Remove an agent
  work agents --remove "frontend-styling"
`)
}

function parseCliArgs(argv: string[]): AgentsCliArgs | null {
  const args = argv.slice(2)
  const parsed: AgentsCliArgs = { add: false, json: false }

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

      case "--add":
        parsed.add = true
        break

      case "--remove":
        if (!next) {
          console.error("Error: --remove requires an agent name")
          return null
        }
        parsed.remove = next
        i++
        break

      case "--name":
        if (!next) {
          console.error("Error: --name requires a value")
          return null
        }
        parsed.name = next
        i++
        break

      case "--description":
        if (!next) {
          console.error("Error: --description requires a value")
          return null
        }
        parsed.description = next
        i++
        break

      case "--best-for":
        if (!next) {
          console.error("Error: --best-for requires a value")
          return null
        }
        parsed.bestFor = next
        i++
        break

      case "--model":
        if (!next) {
          console.error("Error: --model requires a value")
          return null
        }
        parsed.model = next
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

  // Validate --add requirements
  if (parsed.add) {
    if (!parsed.name) {
      console.error("Error: --add requires --name")
      return null
    }
    if (!parsed.description) {
      console.error("Error: --add requires --description")
      return null
    }
    if (!parsed.bestFor) {
      console.error("Error: --add requires --best-for")
      return null
    }
    if (!parsed.model) {
      console.error("Error: --add requires --model")
      return null
    }
  }

  return parsed
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

  // Handle --remove
  if (cliArgs.remove) {
    try {
      const removed = removeAgent(repoRoot, cliArgs.remove)
      if (!removed) {
        console.error(`Error: Agent "${cliArgs.remove}" not found`)
        process.exit(1)
      }

      if (cliArgs.json) {
        console.log(JSON.stringify({ action: "removed", agent: cliArgs.remove }, null, 2))
      } else {
        console.log(`Removed agent "${cliArgs.remove}"`)
      }
    } catch (e) {
      console.error((e as Error).message)
      process.exit(1)
    }
    return
  }

  // Handle --add
  if (cliArgs.add) {
    const agent: AgentDefinition = {
      name: cliArgs.name!,
      description: cliArgs.description!,
      bestFor: cliArgs.bestFor!,
      model: cliArgs.model!,
    }

    try {
      addAgent(repoRoot, agent)

      if (cliArgs.json) {
        console.log(JSON.stringify({ action: "added", agent }, null, 2))
      } else {
        console.log(`Added agent "${agent.name}"`)
        console.log(`  Description: ${agent.description}`)
        console.log(`  Best for: ${agent.bestFor}`)
        console.log(`  Model: ${agent.model}`)
      }
    } catch (e) {
      console.error((e as Error).message)
      process.exit(1)
    }
    return
  }

  // Default: list agents
  const config = getAgentsConfig(repoRoot)

  if (!config || config.agents.length === 0) {
    if (cliArgs.json) {
      console.log(JSON.stringify({ agents: [] }, null, 2))
    } else {
      console.log("No agents defined.")
      console.log("")
      console.log(`Add agents with: work agents --add --name "agent-name" --description "..." --best-for "..." --model "claude-opus"`)
      console.log(`Config file: ${getAgentsMdPath(repoRoot)}`)
    }
    return
  }

  const agents = listAgents(config)

  if (cliArgs.json) {
    console.log(JSON.stringify({ agents }, null, 2))
  } else {
    console.log("Available Agents:")
    console.log("")
    for (const agent of agents) {
      console.log(`  ${agent.name}`)
      console.log(`    Description: ${agent.description}`)
      console.log(`    Best for: ${agent.bestFor}`)
      console.log(`    Model: ${agent.model}`)
      console.log("")
    }
    console.log(`Config file: ${getAgentsMdPath(repoRoot)}`)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
