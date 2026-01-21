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
  thread?: string
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
  --thread, -th      Thread ID (e.g., "01.01.01")
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
  # Assign an agent to a thread
  work assign --thread "01.01.01" --agent "backend-expert"

  # Assign an agent to a specific task
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

      case "--thread":
      case "-th":
        if (!next) {
          console.error("Error: --thread requires a value (e.g., '01.01.01')")
          return null
        }
        parsed.thread = next
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
    // Determine targets
    let targetTasks: string[] = []

    if (cliArgs.task) {
      targetTasks.push(cliArgs.task)
    } else if (cliArgs.thread) {
      // Find all tasks in thread
      const tasks = getTasks(repoRoot, stream.id)
      const threadPrefix = cliArgs.thread + "."
      targetTasks = tasks
        .filter((t) => t.id.startsWith(threadPrefix))
        .map((t) => t.id)

      if (targetTasks.length === 0) {
        console.error(`Error: No tasks found for thread "${cliArgs.thread}"`)
        process.exit(1)
      }
    } else {
      console.error("Error: --clear requires --task or --thread")
      console.error("\nRun with --help for usage information.")
      process.exit(1)
    }

    let successCount = 0
    const errors: string[] = []

    for (const taskId of targetTasks) {
      const existingTask = getTaskById(repoRoot, stream.id, taskId)
      if (!existingTask) {
        errors.push(`Task "${taskId}" not found`)
        continue
      }

      const updated = updateTaskStatus(repoRoot, stream.id, taskId, {
        assigned_agent: "",
      })

      if (!updated) {
        errors.push(`Failed to update task "${taskId}"`)
      } else {
        successCount++
      }
    }

    if (errors.length > 0) {
      console.error("Errors clearing assignments:")
      errors.forEach((e) => console.error(`  - ${e}`))
    }

    if (cliArgs.json) {
      console.log(
        JSON.stringify(
          {
            action: "cleared",
            streamId: stream.id,
            clearedCount: successCount,
            errors,
          },
          null,
          2
        )
      )
    } else {
      console.log(`Cleared agent assignment from ${successCount} tasks`)
    }

    if (errors.length > 0) process.exit(1)
    return
  }

  // Default: create assignment
  if ((!cliArgs.task && !cliArgs.thread) || !cliArgs.agent) {
    console.error("Error: --agent and either --task or --thread are required")
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

  // Identify target tasks
  let targetTasks: { id: string; name: string }[] = []

  if (cliArgs.task) {
    const existingTask = getTaskById(repoRoot, stream.id, cliArgs.task)
    if (!existingTask) {
      console.error(`Error: Task "${cliArgs.task}" not found`)
      process.exit(1)
    }
    targetTasks.push(existingTask)
  } else if (cliArgs.thread) {
    // Find all tasks in thread
    const tasks = getTasks(repoRoot, stream.id)
    const threadPrefix = cliArgs.thread + "."
    targetTasks = tasks
      .filter((t) => t.id.startsWith(threadPrefix))

    if (targetTasks.length === 0) {
      console.error(`Error: No tasks found for thread "${cliArgs.thread}"`)
      process.exit(1)
    }
  }

  // Update tasks
  let successCount = 0
  const errors: string[] = []

  for (const task of targetTasks) {
    const updated = updateTaskStatus(repoRoot, stream.id, task.id, {
      assigned_agent: cliArgs.agent,
    })

    if (!updated) {
      errors.push(`Failed to update task "${task.id}"`)
    } else {
      successCount++
    }
  }

  if (cliArgs.json) {
    console.log(
      JSON.stringify(
        {
          action: "assigned",
          streamId: stream.id,
          agent: cliArgs.agent,
          assignedCount: successCount,
          errors,
        },
        null,
        2
      )
    )
  } else {
    console.log(`Assigned "${cliArgs.agent}" to ${successCount} tasks`)
    if (cliArgs.thread) {
      console.log(`Thread: ${cliArgs.thread}`)
    } else {
      console.log(`Task: ${targetTasks[0]?.name}`)
    }
  }

  if (errors.length > 0) {
    console.error("Errors assigning agent:")
    errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
