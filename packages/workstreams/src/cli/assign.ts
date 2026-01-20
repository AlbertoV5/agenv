/**
 * CLI: Assign Agents to Tasks
 *
 * Assign agents to tasks in tasks.json.
 * Agent assignments are stored directly on each task.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getTasks, updateTaskStatus, getTaskById } from "../lib/tasks.ts"
import { getAgentsConfig, getAgent } from "../lib/agents.ts"

interface AssignCliArgs {
  repoRoot?: string
  streamId?: string
  task?: string
  agent?: string
  list: boolean
  clear: boolean
  json: boolean
}

function printHelp(): void {
  console.log(`
work assign - Assign agents to tasks

Usage:
  work assign --task <taskId> --agent <agent>
  work assign --task <taskId> --clear
  work assign --list

Options:
  --repo-root, -r    Repository root (auto-detected if omitted)
  --stream, -s       Workstream ID or name (uses current if not specified)
  --task, -t         Task ID (e.g., "01.01.02.03")
  --agent, -a        Agent name to assign
  --list             List all tasks with agent assignments
  --clear            Remove agent assignment from task
  --json, -j         Output as JSON
  --help, -h         Show this help message

Description:
  Assigns agents to tasks for execution. Agents must be defined first
  using 'work agents --add'. Assignments are stored in tasks.json.

Examples:
  # Assign an agent to a task
  work assign --task "01.01.02.03" --agent "backend-orm-expert"

  # List all tasks with assignments
  work assign --list

  # Remove an assignment
  work assign --task "01.01.02.03" --clear
`)
}

function parseCliArgs(argv: string[]): AssignCliArgs | null {
  const args = argv.slice(2)
  const parsed: AssignCliArgs = { list: false, clear: false, json: false }

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

      case "--stream":
      case "-s":
      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--task":
      case "-t":
        if (!next) {
          console.error("Error: --task requires a value (e.g., '01.01.02.03')")
          return null
        }
        parsed.task = next
        i++
        break

      case "--agent":
      case "-a":
        if (!next) {
          console.error("Error: --agent requires a value")
          return null
        }
        parsed.agent = next
        i++
        break

      case "--list":
        parsed.list = true
        break

      case "--clear":
        parsed.clear = true
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

  // Load index and find workstream
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  let stream
  try {
    stream = getResolvedStream(index, cliArgs.streamId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Handle --list
  if (cliArgs.list) {
    const tasks = getTasks(repoRoot, stream.id)
    const assignedTasks = tasks.filter((t) => t.assigned_agent)

    if (cliArgs.json) {
      console.log(JSON.stringify({ streamId: stream.id, tasks: assignedTasks }, null, 2))
    } else {
      if (assignedTasks.length === 0) {
        console.log(`No tasks have agent assignments in workstream "${stream.name}"`)
        return
      }

      console.log(`Tasks with agent assignments in "${stream.name}":`)
      console.log("")

      for (const t of assignedTasks) {
        console.log(`  ${t.id} -> ${t.assigned_agent}`)
        console.log(`    ${t.name}`)
        console.log("")
      }
    }
    return
  }

  // Handle --clear
  if (cliArgs.clear) {
    if (!cliArgs.task) {
      console.error("Error: --clear requires --task")
      console.error("\nRun with --help for usage information.")
      process.exit(1)
    }

    const existingTask = getTaskById(repoRoot, stream.id, cliArgs.task)
    if (!existingTask) {
      console.error(`Error: Task "${cliArgs.task}" not found`)
      process.exit(1)
    }

    // Clear the assignment by setting to empty string (will be treated as no assignment)
    const updated = updateTaskStatus(repoRoot, stream.id, cliArgs.task, {
      assigned_agent: "",
    })

    if (!updated) {
      console.error(`Error: Failed to update task "${cliArgs.task}"`)
      process.exit(1)
    }

    if (cliArgs.json) {
      console.log(
        JSON.stringify({ action: "cleared", streamId: stream.id, taskId: cliArgs.task }, null, 2)
      )
    } else {
      console.log(`Cleared agent assignment from task "${cliArgs.task}"`)
    }
    return
  }

  // Default: create assignment
  if (!cliArgs.task || !cliArgs.agent) {
    console.error("Error: --task and --agent are required to create an assignment")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Verify agent exists
  const agentsConfig = getAgentsConfig(repoRoot)
  if (agentsConfig) {
    const agentDef = getAgent(agentsConfig, cliArgs.agent)
    if (!agentDef) {
      console.error(`Error: Agent "${cliArgs.agent}" is not defined`)
      console.error("Add it first with: work agents --add")
      process.exit(1)
    }
  }

  // Verify task exists
  const existingTask = getTaskById(repoRoot, stream.id, cliArgs.task)
  if (!existingTask) {
    console.error(`Error: Task "${cliArgs.task}" not found`)
    process.exit(1)
  }

  // Update task with agent assignment
  const updated = updateTaskStatus(repoRoot, stream.id, cliArgs.task, {
    assigned_agent: cliArgs.agent,
  })

  if (!updated) {
    console.error(`Error: Failed to update task "${cliArgs.task}"`)
    process.exit(1)
  }

  if (cliArgs.json) {
    console.log(
      JSON.stringify(
        {
          action: "assigned",
          streamId: stream.id,
          taskId: cliArgs.task,
          agent: cliArgs.agent,
        },
        null,
        2
      )
    )
  } else {
    console.log(`Assigned "${cliArgs.agent}" to task "${cliArgs.task}"`)
    console.log(`  Task: ${existingTask.name}`)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
