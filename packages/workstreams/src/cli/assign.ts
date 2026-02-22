/**
 * CLI: Assign Agents to Threads
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getThreads, getThreadMetadata, updateThreadStatus } from "../lib/threads.ts"
import { loadAgentsConfig, getAgentYaml } from "../lib/agents-yaml.ts"

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
work assign - Assign agents to threads

Usage:
  work assign --thread <threadId> --agent <agent>
  work assign --thread <threadId> --clear
  work assign --list

Options:
  --repo-root, -r    Repository root (auto-detected if omitted)
  --stream, -s       Workstream ID or name (uses current if not specified)
  --thread, -th      Thread ID (e.g., "01.01.01")
  --task, -t         Deprecated alias; mapped to thread when possible
  --agent, -a        Agent name to assign
  --list             List all thread assignments
  --clear            Remove assignment from thread
  --json, -j         Output as JSON
  --help, -h         Show this help message
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
        if (!next) return null
        parsed.repoRoot = next
        i++
        break
      case "--stream":
      case "-s":
      case "--plan":
      case "-p":
        if (!next) return null
        parsed.streamId = next
        i++
        break
      case "--task":
      case "-t":
        if (!next) return null
        parsed.task = next
        i++
        break
      case "--thread":
      case "-th":
        if (!next) return null
        parsed.thread = next
        i++
        break
      case "--agent":
      case "-a":
        if (!next) return null
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

  if (!parsed.thread && parsed.task) {
    const parts = parsed.task.split(".")
    if (parts.length === 4) {
      parsed.thread = `${parts[0]}.${parts[1]}.${parts[2]}`
      console.error(`Deprecation: --task is deprecated; mapped to --thread "${parsed.thread}".`)
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

  const repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  const index = loadIndex(repoRoot)
  const stream = getResolvedStream(index, cliArgs.streamId)

  if (cliArgs.list) {
    const assigned = getThreads(repoRoot, stream.id).filter((t) => !!t.assignedAgent)
    if (cliArgs.json) {
      console.log(JSON.stringify({ streamId: stream.id, threads: assigned }, null, 2))
    } else if (assigned.length === 0) {
      console.log(`No threads have agent assignments in workstream "${stream.name}"`)
    } else {
      for (const t of assigned) {
        console.log(`${t.threadId} -> ${t.assignedAgent}`)
      }
    }
    return
  }

  if (!cliArgs.thread) {
    console.error("Error: --thread is required")
    process.exit(1)
  }

  const existing = getThreadMetadata(repoRoot, stream.id, cliArgs.thread)
  if (!existing) {
    console.error(`Error: Thread "${cliArgs.thread}" not found`)
    process.exit(1)
  }

  if (cliArgs.clear) {
    updateThreadStatus(repoRoot, stream.id, cliArgs.thread, { assignedAgent: "" })
    console.log(`Cleared agent assignment for thread ${cliArgs.thread}`)
    return
  }

  if (!cliArgs.agent) {
    console.error("Error: --agent is required")
    process.exit(1)
  }

  const agentsConfig = loadAgentsConfig(repoRoot)
  if (agentsConfig && !getAgentYaml(agentsConfig, cliArgs.agent)) {
    console.error(`Error: Agent "${cliArgs.agent}" is not defined`) 
    process.exit(1)
  }

  updateThreadStatus(repoRoot, stream.id, cliArgs.thread, { assignedAgent: cliArgs.agent })
  console.log(`Assigned "${cliArgs.agent}" to thread ${cliArgs.thread}`)
}

if (import.meta.main) {
  main()
}
