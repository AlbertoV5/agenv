/**
 * CLI: Fix Command
 *
 * Interactive command to resume, retry, or fix incomplete/failed threads
 */

import { spawn } from "child_process"
import { existsSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import {
  getTasks,
  parseThreadId,
  getTasksByThread,
  startTaskSession,
  completeTaskSession,
} from "../lib/tasks.ts"
import { loadAgentsConfig, getAgentModels } from "../lib/agents-yaml.ts"
import { resolvePromptPath } from "../lib/prompt-paths.ts"
import { getLastSessionForThread, getWorkingAgentSessionId, getOpencodeSessionId } from "../lib/threads.ts"
import type { Task, SessionRecord, SessionStatus, NormalizedModelSpec } from "../lib/types.ts"
import {
  sessionExists,
  createSession,
  attachSession,
  setGlobalOption,
} from "../lib/tmux.ts"
import {
  createReadlineInterface,
  buildThreadStatuses,
  selectThreadFromStatuses,
  selectFixAction,
  selectAgent,
  confirmAction,
  type ThreadStatus,
  type AgentOption,
} from "../lib/interactive.ts"
import { main as addStageMain } from "./add-stage.ts"

interface FixCliArgs {
  repoRoot?: string
  streamId?: string
  threadId?: string
  resume?: boolean
  retry?: boolean
  agent?: string
  newStage?: boolean
  dryRun?: boolean
  json?: boolean
  noTmux?: boolean
}

function printHelp(): void {
  console.log(`
work fix - Resume, retry, or fix incomplete/failed threads

Usage:
  work fix [options]
  work fix --thread <id> [--resume|--retry|--agent <name>|--new-stage]

Options:
  --thread <id>        Thread to fix (e.g., "01.01.02"). Interactive if omitted.
  --resume             Resume the existing session
  --retry              Retry with the same agent
  --agent <name>       Retry with a different agent
  --new-stage          Create a new fix stage (alias to add-stage)
  --no-tmux            Run in foreground (no tmux session, useful for debugging)
  --stream, -s         Workstream ID or name (uses current if not specified)
  --dry-run            Show what would be done without executing
  --json, -j           Output as JSON
  --repo-root, -r      Repository root (auto-detected if omitted)
  --help, -h           Show this help message

Interactive Mode:
  If --thread is not provided, displays a table of incomplete/failed threads
  and prompts for thread selection and action.

Tmux Sessions:
  By default, fix commands run in a tmux session (work-fix-{threadId}).
  - Detach with Ctrl-B D to let the process continue in background.
  - Reattach later with: tmux attach -t work-fix-{threadId}
  - Use --no-tmux to run in foreground (old behavior).

Examples:
  work fix                                    # Interactive mode
  work fix --thread 01.01.02 --resume         # Resume specific thread
  work fix --thread 01.01.02 --retry          # Retry with same agent
  work fix --thread 01.01.02 --agent backend  # Retry with different agent
  work fix --thread 01.01.02 --retry --no-tmux # Retry in foreground
`)
}

function parseCliArgs(argv: string[]): FixCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<FixCliArgs> = {}

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

      case "--thread":
      case "-t":
        if (!next) {
          console.error("Error: --thread requires a value")
          return null
        }
        parsed.threadId = next
        i++
        break

      case "--resume":
        parsed.resume = true
        break

      case "--retry":
        parsed.retry = true
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

      case "--new-stage":
        parsed.newStage = true
        break

      case "--dry-run":
        parsed.dryRun = true
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--no-tmux":
        parsed.noTmux = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as FixCliArgs
}

// ============================================
// EXECUTION HELPERS
// ============================================

/**
 * Generate the tmux session name for a fix operation
 */
function getFixSessionName(threadId: string): string {
  // Replace dots with dashes for tmux-friendly session names
  const safeThreadId = threadId.replace(/\./g, "-")
  return `work-fix-${safeThreadId}`
}



/**
 * Execute resume action - opens opencode TUI with existing session
 * 
 * Session ID priority:
 * 1. workingAgentSessionId - Legacy field for backwards compatibility 
 * 2. opencodeSessionId - The working agent session (in post-session synthesis mode)
 * 3. lastSession.sessionId - Fallback to session record's tracking ID
 * 
 * Note: In post-session synthesis mode, opencodeSessionId contains the working
 * agent session ID since synthesis runs headless (no TUI).
 */
async function executeResume(
  repoRoot: string,
  streamId: string,
  threadStatus: ThreadStatus,
  dryRun?: boolean,
  noTmux?: boolean
): Promise<void> {
  const lastSession = getLastSessionForThread(repoRoot, streamId, threadStatus.threadId)

  if (!lastSession) {
    console.error(`Error: No session found for thread ${threadStatus.threadId}`)
    console.error("Use --retry to start a new session instead.")
    process.exit(1)
  }

  // Determine which session ID to use for resume
  // Priority: workingAgentSessionId > opencodeSessionId > lastSession.sessionId
  // With post-session synthesis, opencodeSessionId IS the working agent session
  const workingSessionId = getWorkingAgentSessionId(repoRoot, streamId, threadStatus.threadId)
  const opencodeSessionId = getOpencodeSessionId(repoRoot, streamId, threadStatus.threadId)
  const resumeSessionId = workingSessionId || opencodeSessionId || lastSession.sessionId
  
  // Determine the source of the session ID for logging
  const sessionSource = workingSessionId 
    ? "working agent" 
    : opencodeSessionId 
      ? "opencode" 
      : "session record"

  const tmuxSessionName = getFixSessionName(threadStatus.threadId)
  const command = `opencode --session "${resumeSessionId}"`

  // Check if there's an existing fix tmux session to reattach to
  const existingSession = !noTmux && sessionExists(tmuxSessionName)

  if (dryRun) {
    console.log("\nDry run - would execute:")
    if (existingSession) {
      console.log(`  tmux attach -t "${tmuxSessionName}"`)
      console.log(`\n(Reattaching to existing tmux session)`)
    } else if (noTmux) {
      console.log(`  ${command}`)
    } else {
      console.log(`  tmux new-session -s "${tmuxSessionName}" "${command}"`)
    }
    console.log(`\nThread: ${threadStatus.threadName} (${threadStatus.threadId})`)
    console.log(`Session ID: ${resumeSessionId} (${sessionSource})`)
    console.log(`Agent: ${lastSession.agentName}`)
    console.log(`Model: ${lastSession.model}`)
    return
  }

  console.log(`\nResuming session for thread ${threadStatus.threadName} (${threadStatus.threadId})...`)
  console.log(`Session ID: ${resumeSessionId} (${sessionSource})`)
  console.log(`Agent: ${lastSession.agentName}`)
  console.log(`Model: ${lastSession.model}`)

  // If there's an existing tmux session, reattach to it
  if (existingSession) {
    console.log(`\nReattaching to existing tmux session "${tmuxSessionName}"...`)
    console.log("  Detach: Ctrl-B D")
    console.log(`  Reattach: tmux attach -t ${tmuxSessionName}`)
    console.log("")

    const child = attachSession(tmuxSessionName)

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        console.log(`\nDetached from session "${tmuxSessionName}".`)
        console.log(`Process continues in background.`)
        console.log(`Reattach: tmux attach -t ${tmuxSessionName}`)
        resolve()
      })

      child.on("error", (err) => {
        console.error(`Error attaching to tmux session: ${err.message}`)
        reject(err)
      })
    })
    return
  }

  // Run in foreground without tmux
  if (noTmux) {
    console.log("")

    const child = spawn("opencode", ["--session", resumeSessionId], {
      stdio: "inherit",
      cwd: repoRoot,
    })

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) {
          resolve()
        } else {
          process.exit(code ?? 1)
        }
      })

      child.on("error", (err) => {
        console.error(`Error executing command: ${err.message}`)
        reject(err)
      })
    })
    return
  }

  // Create new tmux session with opencode
  console.log(`\nCreating tmux session "${tmuxSessionName}"...`)
  console.log("  Detach: Ctrl-B D")
  console.log(`  Reattach: tmux attach -t ${tmuxSessionName}`)
  console.log("")

  createSession(tmuxSessionName, threadStatus.threadName, command)

  // Keep window open after command exits for reviewing output
  setGlobalOption(tmuxSessionName, "remain-on-exit", "on")

  // Attach to the session
  const child = attachSession(tmuxSessionName)

  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      console.log(`\nDetached from session "${tmuxSessionName}".`)
      console.log(`Process continues in background.`)
      console.log(`Reattach: tmux attach -t ${tmuxSessionName}`)
      resolve()
    })

    child.on("error", (err) => {
      console.error(`Error attaching to tmux session: ${err.message}`)
      reject(err)
    })
  })
}

/**
 * Execute retry action - starts new session with same or different agent
 */
async function executeRetry(
  repoRoot: string,
  streamId: string,
  threadStatus: ThreadStatus,
  agentName: string,
  models: NormalizedModelSpec[],
  dryRun?: boolean,
  noTmux?: boolean
): Promise<void> {
  const promptPath = resolvePromptPath(repoRoot, streamId, threadStatus.threadId)

  if (!promptPath || !existsSync(promptPath)) {
    console.error(`Error: Prompt file not found for thread ${threadStatus.threadId}`)
    console.error(`Expected: ${promptPath}`)
    console.error(`\nHint: Run 'work prompt --thread "${threadStatus.threadId}"' to generate it first.`)
    process.exit(1)
  }

  const primaryModel = models[0]!
  const variantFlag = primaryModel.variant ? ` --variant "${primaryModel.variant}"` : ""
  const command = `cat "${promptPath}" | opencode run --model "${primaryModel.model}"${variantFlag}`
  const tmuxSessionName = getFixSessionName(threadStatus.threadId)

  if (dryRun) {
    console.log("\nDry run - would execute:")
    if (noTmux) {
      console.log(`  ${command}`)
    } else {
      console.log(`  tmux new-session -s "${tmuxSessionName}" "${command}"`)
    }
    console.log(`\nThread: ${threadStatus.threadName} (${threadStatus.threadId})`)
    console.log(`Agent: ${agentName}`)
    console.log(`Model: ${primaryModel.model}${primaryModel.variant ? ` (variant: ${primaryModel.variant})` : ""}`)
    console.log(`Prompt: ${promptPath}`)
    if (!noTmux) {
      console.log(`\nTmux session: ${tmuxSessionName}`)
      console.log(`  Detach: Ctrl-B D`)
      console.log(`  Reattach: tmux attach -t ${tmuxSessionName}`)
    }
    return
  }

  // Check if a fix session already exists for this thread
  if (!noTmux && sessionExists(tmuxSessionName)) {
    console.error(`Error: tmux session "${tmuxSessionName}" already exists.`)
    console.error(`\nOptions:`)
    console.error(`  1. Reattach: tmux attach -t "${tmuxSessionName}"`)
    console.error(`  2. Kill it: tmux kill-session -t "${tmuxSessionName}"`)
    console.error(`  3. Use --no-tmux to run in foreground`)
    process.exit(1)
  }

  // Parse thread ID for task operations
  const threadParsed = parseThreadId(threadStatus.threadId)
  const threadTasks = getTasksByThread(
    repoRoot,
    streamId,
    threadParsed.stage,
    threadParsed.batch,
    threadParsed.thread
  )

  // Start sessions for all tasks in the thread
  const modelString = primaryModel.variant
    ? `${primaryModel.model}:${primaryModel.variant}`
    : primaryModel.model

  const sessionIds: Map<string, string> = new Map()
  for (const task of threadTasks) {
    const session = startTaskSession(
      repoRoot,
      streamId,
      task.id,
      agentName,
      modelString
    )
    if (session) {
      sessionIds.set(task.id, session.sessionId)
    }
  }

  console.log(`\nRetrying thread ${threadStatus.threadName} (${threadStatus.threadId}) with agent "${agentName}"...`)
  console.log(`Model: ${primaryModel.model}${primaryModel.variant ? ` (variant: ${primaryModel.variant})` : ""}`)
  console.log(`Session tracking: ${sessionIds.size} task(s)`)
  console.log(`Prompt: ${promptPath}`)

  // Run in foreground without tmux
  if (noTmux) {
    console.log("")

    const child = spawn("sh", ["-c", command], {
      stdio: "inherit",
      cwd: repoRoot,
    })

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        // Determine session status based on exit code
        const sessionStatus: SessionStatus = code === 0 ? "completed" : "failed"

        // Complete all sessions for this thread
        for (const [taskId, sessionId] of sessionIds) {
          completeTaskSession(repoRoot, streamId, taskId, sessionId, sessionStatus, code ?? undefined)
        }

        if (code === 0) {
          resolve()
        } else {
          process.exit(code ?? 1)
        }
      })

      child.on("error", (err) => {
        // Mark all sessions as failed on error
        for (const [taskId, sessionId] of sessionIds) {
          completeTaskSession(repoRoot, streamId, taskId, sessionId, "failed")
        }

        console.error(`Error executing command: ${err.message}`)
        reject(err)
      })
    })
    return
  }

  // Create tmux session with the command
  console.log(`\nCreating tmux session "${tmuxSessionName}"...`)
  console.log("  Detach: Ctrl-B D")
  console.log(`  Reattach: tmux attach -t ${tmuxSessionName}`)
  console.log("")

  createSession(tmuxSessionName, threadStatus.threadName, command)

  // Keep window open after command exits for reviewing output
  setGlobalOption(tmuxSessionName, "remain-on-exit", "on")

  // Attach to the session
  const child = attachSession(tmuxSessionName)

  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      // When user detaches, the process continues in background
      // We can't determine exit status here since the process may still be running
      console.log(`\nDetached from session "${tmuxSessionName}".`)
      
      // Check if the session still exists (process still running)
      if (sessionExists(tmuxSessionName)) {
        console.log(`Process continues in background.`)
        console.log(`Reattach: tmux attach -t ${tmuxSessionName}`)
        console.log(`\nNote: Session status will be updated when the process completes.`)
      } else {
        // Session was killed - mark as completed (user confirmed done)
        console.log(`Session closed.`)
        for (const [taskId, sessionId] of sessionIds) {
          completeTaskSession(repoRoot, streamId, taskId, sessionId, "completed")
        }
      }
      resolve()
    })

    child.on("error", (err) => {
      // Mark all sessions as failed on error
      for (const [taskId, sessionId] of sessionIds) {
        completeTaskSession(repoRoot, streamId, taskId, sessionId, "failed")
      }

      console.error(`Error attaching to tmux session: ${err.message}`)
      reject(err)
    })
  })
}

/**
 * Execute new-stage action - forwards to add-stage command
 */
function executeNewStage(argv: string[]): void {
  // Forward all arguments to add-stage
  addStageMain(argv)
}

/**
 * Find incomplete or failed threads from tasks
 */
function findIncompleteThreads(tasks: any[]): string[] {
  const threadMap = new Map<string, any[]>()
  
  // Group tasks by thread
  for (const task of tasks) {
    const parts = task.id.split(".")
    if (parts.length >= 3) {
      const threadId = `${parts[0]}.${parts[1]}.${parts[2]}`
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, [])
      }
      threadMap.get(threadId)!.push(task)
    }
  }
  
  // Filter to incomplete or failed threads
  const incompleteThreads: string[] = []
  for (const [threadId, threadTasks] of threadMap.entries()) {
    const allCompleted = threadTasks.every(t => t.status === "completed" || t.status === "cancelled")
    if (!allCompleted) {
      incompleteThreads.push(threadId)
    }
  }
  
  return incompleteThreads.sort()
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Handle --new-stage early - it's an alias for add-stage
  if (cliArgs.newStage && !cliArgs.threadId) {
    executeNewStage(argv)
    return
  }

  // Auto-detect repo root if not provided
  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

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

  // Load tasks
  const tasks = getTasks(repoRoot, stream.id)
  
  // Find incomplete threads
  const incompleteThreads = findIncompleteThreads(tasks)
  
  if (incompleteThreads.length === 0 && !cliArgs.threadId) {
    console.log("No incomplete or failed threads found.")
    return
  }

  // If command-line flags specify everything, skip interactive mode
  if (cliArgs.threadId && (cliArgs.resume || cliArgs.retry || cliArgs.agent)) {
    const threadStatuses = buildThreadStatuses(tasks, [cliArgs.threadId])
    if (threadStatuses.length === 0) {
      console.error(`Error: Thread ${cliArgs.threadId} not found`)
      
      // Show available threads
      const allThreadIds = [...new Set(tasks.map(t => {
        const parts = t.id.split(".")
        return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : null
      }).filter(Boolean))]
      
      if (allThreadIds.length > 0) {
        console.error("\nAvailable threads:")
        for (const id of allThreadIds.slice(0, 10)) {
          console.error(`  ${id}`)
        }
        if (allThreadIds.length > 10) {
          console.error(`  ... and ${allThreadIds.length - 10} more`)
        }
      }
      process.exit(1)
    }
    
    const selectedStatus = threadStatuses[0]!
    
    // Execute the specified action directly
    if (cliArgs.resume) {
      await executeResume(repoRoot, stream.id, selectedStatus, cliArgs.dryRun, cliArgs.noTmux)
      return
    }
    
    if (cliArgs.retry) {
      // Get agent from last session or default
      const agentName = selectedStatus.lastAgent || "default"
      
      const agentsConfig = loadAgentsConfig(repoRoot)
      if (!agentsConfig) {
        console.error("Error: No agents.yaml found. Run 'work init' to create one.")
        process.exit(1)
      }
      
      const models = getAgentModels(agentsConfig, agentName)
      if (models.length === 0) {
        console.error(`Error: Agent "${agentName}" not found in agents.yaml`)
        console.error(`\nAvailable agents: ${agentsConfig.agents.map((a) => a.name).join(", ")}`)
        process.exit(1)
      }
      
      await executeRetry(repoRoot, stream.id, selectedStatus, agentName, models, cliArgs.dryRun, cliArgs.noTmux)
      return
    }
    
    if (cliArgs.agent) {
      const agentsConfig = loadAgentsConfig(repoRoot)
      if (!agentsConfig) {
        console.error("Error: No agents.yaml found. Run 'work init' to create one.")
        process.exit(1)
      }
      
      const models = getAgentModels(agentsConfig, cliArgs.agent)
      if (models.length === 0) {
        console.error(`Error: Agent "${cliArgs.agent}" not found in agents.yaml`)
        console.error(`\nAvailable agents: ${agentsConfig.agents.map((a) => a.name).join(", ")}`)
        process.exit(1)
      }
      
      await executeRetry(repoRoot, stream.id, selectedStatus, cliArgs.agent, models, cliArgs.dryRun, cliArgs.noTmux)
      return
    }
  }

  // Interactive mode
  const rl = createReadlineInterface()
  
  try {
    let selectedThreadId: string
    let selectedStatus: ThreadStatus
    
    // Thread selection
    if (cliArgs.threadId) {
      // Use provided thread ID
      selectedThreadId = cliArgs.threadId
      const threadStatuses = buildThreadStatuses(tasks, [selectedThreadId])
      if (threadStatuses.length === 0) {
        console.error(`Error: Thread ${selectedThreadId} not found`)
        process.exit(1)
      }
      selectedStatus = threadStatuses[0]!
    } else {
      // Interactive thread selection
      const threadStatuses = buildThreadStatuses(tasks, incompleteThreads)
      const selection = await selectThreadFromStatuses(rl, threadStatuses)
      selectedStatus = selection.value
      selectedThreadId = selectedStatus.threadId
    }
    
    // Action selection
    let action: string
    let selectedAgent: string | undefined
    
    if (cliArgs.resume) {
      action = "resume"
    } else if (cliArgs.retry) {
      action = "retry"
    } else if (cliArgs.agent) {
      action = "change-agent"
      selectedAgent = cliArgs.agent
    } else if (cliArgs.newStage) {
      action = "new-stage"
    } else {
      // Interactive action selection
      const selectedAction = await selectFixAction(rl, selectedStatus)
      action = selectedAction
      
      // If change-agent, prompt for agent selection
      if (action === "change-agent") {
        const agentsConfig = loadAgentsConfig(repoRoot)
        if (!agentsConfig || agentsConfig.agents.length === 0) {
          console.error("Error: No agents found in agents.yaml")
          process.exit(1)
        }
        
        const agentOptions: AgentOption[] = agentsConfig.agents.map(a => ({
          name: a.name,
          description: a.description,
          bestFor: a.best_for
        }))
        
        const agentSelection = await selectAgent(rl, agentOptions)
        selectedAgent = agentSelection.value.name
      }
    }
    
    // Confirmation (skip for dry-run)
    if (!cliArgs.dryRun) {
      let confirmMessage = ""
      switch (action) {
        case "resume":
          confirmMessage = `Resume thread ${selectedThreadId} (${selectedStatus.threadName})?`
          break
        case "retry":
          confirmMessage = `Retry thread ${selectedThreadId} (${selectedStatus.threadName}) with agent ${selectedStatus.lastAgent || "default"}?`
          break
        case "change-agent":
          confirmMessage = `Retry thread ${selectedThreadId} (${selectedStatus.threadName}) with agent ${selectedAgent}?`
          break
        case "new-stage":
          confirmMessage = `Create a new fix stage for thread ${selectedThreadId}?`
          break
      }
      
      const confirmed = await confirmAction(rl, confirmMessage)
      
      if (!confirmed) {
        console.log("Action cancelled.")
        rl.close()
        return
      }
    }
    
    // Close readline before executing (exec might need stdin)
    rl.close()
    
    // Execute action
    switch (action) {
      case "resume":
        await executeResume(repoRoot, stream.id, selectedStatus, cliArgs.dryRun, cliArgs.noTmux)
        break
        
      case "retry": {
        const agentName = selectedStatus.lastAgent || "default"
        const agentsConfig = loadAgentsConfig(repoRoot)
        if (!agentsConfig) {
          console.error("Error: No agents.yaml found. Run 'work init' to create one.")
          process.exit(1)
        }
        
        const models = getAgentModels(agentsConfig, agentName)
        if (models.length === 0) {
          console.error(`Error: Agent "${agentName}" not found in agents.yaml`)
          console.error(`\nAvailable agents: ${agentsConfig.agents.map((a) => a.name).join(", ")}`)
          process.exit(1)
        }
        
        await executeRetry(repoRoot, stream.id, selectedStatus, agentName, models, cliArgs.dryRun, cliArgs.noTmux)
        break
      }
        
      case "change-agent": {
        if (!selectedAgent) {
          console.error("Error: No agent selected")
          process.exit(1)
        }
        
        const agentsConfig = loadAgentsConfig(repoRoot)
        if (!agentsConfig) {
          console.error("Error: No agents.yaml found. Run 'work init' to create one.")
          process.exit(1)
        }
        
        const models = getAgentModels(agentsConfig, selectedAgent)
        if (models.length === 0) {
          console.error(`Error: Agent "${selectedAgent}" not found in agents.yaml`)
          console.error(`\nAvailable agents: ${agentsConfig.agents.map((a) => a.name).join(", ")}`)
          process.exit(1)
        }
        
        await executeRetry(repoRoot, stream.id, selectedStatus, selectedAgent, models, cliArgs.dryRun, cliArgs.noTmux)
        break
      }
        
      case "new-stage":
        // Forward to add-stage with relevant context
        console.log("\nTo create a fix stage, run:")
        console.log(`  work add-stage --stage <target-stage> --name "fix-description"`)
        console.log("\nExample:")
        const stageNum = selectedThreadId.split(".")[0]
        console.log(`  work add-stage --stage ${stageNum} --name "thread-${selectedThreadId}-fix"`)
        break
    }
    
  } catch (err) {
    rl.close()
    throw err
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
