/**
 * CLI: Multi
 *
 * Executes all threads in a batch in parallel using tmux sessions.
 * Each thread runs in its own tmux window with an opencode instance
 * connected to a shared opencode serve backend.
 */

import { join } from "path"
import { existsSync } from "fs"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { loadAgentsConfig, getAgentModels } from "../lib/agents-yaml.ts"
import {
  readTasksFile,
  parseTaskId,
  generateSessionId,
  startMultipleSessionsLocked,
  completeMultipleSessionsLocked,
  discoverThreadsInBatch,
  getBatchMetadata,
} from "../lib/tasks.ts"
import type { NormalizedModelSpec } from "../lib/types.ts"
import { MAX_THREADS_PER_BATCH } from "../lib/types.ts"
import {
  sessionExists,
  createSession,
  addWindow,
  selectWindow,
  attachSession,
  killSession,
  getWorkSessionName,
  buildCreateSessionCommand,
  buildAddWindowCommand,
  buildAttachCommand,
  setGlobalOption,
  createGridLayout,
  listPaneIds,
  getSessionPaneStatuses,
  waitForAllPanesExit,
  THREAD_START_DELAY_MS,
  type PaneStatus,
} from "../lib/tmux.ts"
import { getStageApprovalStatus } from "../lib/approval.ts"
import {
  isServerRunning,
  startServer,
  waitForServer,
  buildRetryRunCommand,
  buildServeCommand,
} from "../lib/opencode.ts"
import { playNotification } from "../lib/notifications.ts"

const DEFAULT_PORT = 4096

interface MultiCliArgs {
  repoRoot?: string
  streamId?: string
  batch?: string
  port?: number
  dryRun?: boolean
  noServer?: boolean
  continue?: boolean
  silent?: boolean
}

interface ThreadInfo {
  threadId: string // "01.01.01"
  threadName: string
  stageName: string
  batchName: string
  promptPath: string
  models: NormalizedModelSpec[] // List of models to try in order
  agentName: string
  githubIssue?: {
    number: number
    url: string
    state: "open" | "closed"
  }
  // Session tracking (populated before spawn)
  sessionId?: string
  firstTaskId?: string // First task in thread (for session tracking)
}

/**
 * Mapping of thread sessions to pane IDs
 * Used to track which pane is running which thread's session
 */
interface ThreadSessionMap {
  threadId: string
  sessionId: string
  taskId: string // First task in thread
  paneId: string
  windowIndex: number
}

function printHelp(): void {
  console.log(`
work multi - Execute all threads in a batch in parallel

Usage:
  work multi --batch "01.01" [options]
  work multi --continue [options]

Required:
  --batch, -b      Batch ID to execute (format: "SS.BB", e.g., "01.02")
                   OR uses next incomplete batch if --continue is set

Optional:
  --continue, -c   Continue with the next incomplete batch
  --stream, -s     Workstream ID or name (uses current if not specified)
  --port, -p       OpenCode server port (default: 4096)
  --dry-run        Show commands without executing
  --no-server      Skip starting opencode serve (assume already running)
  --silent         Disable notification sounds (audio only)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Executes all threads in a batch simultaneously in parallel using tmux.
  Each thread runs in its own tmux window with a full opencode TUI.

  A shared opencode serve backend is started (unless --no-server) to
  eliminate MCP cold boot times and share model cache across threads.

Examples:
  work multi --batch "01.01"
  work multi --continue
  work multi --batch "01.01" --dry-run
  work multi --continue --dry-run
`)
}

function parseCliArgs(argv: string[]): MultiCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<MultiCliArgs> = {}

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
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--batch":
      case "-b":
        if (!next) {
          console.error("Error: --batch requires a value")
          return null
        }
        parsed.batch = next
        i++
        break

      case "--continue":
      case "-c":
        parsed.continue = true
        break

      case "--port":
      case "-p":
        if (!next) {
          console.error("Error: --port requires a value")
          return null
        }
        parsed.port = parseInt(next, 10)
        if (isNaN(parsed.port)) {
          console.error("Error: --port must be a number")
          return null
        }
        i++
        break

      case "--dry-run":
        parsed.dryRun = true
        break

      case "--no-server":
        parsed.noServer = true
        break

      case "--silent":
        parsed.silent = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as MultiCliArgs
}

/**
 * Parse batch ID "SS.BB" into stage and batch numbers
 */
function parseBatchId(
  batchId: string,
): { stage: number; batch: number } | null {
  const parts = batchId.split(".")
  if (parts.length !== 2) return null

  const stage = parseInt(parts[0]!, 10)
  const batch = parseInt(parts[1]!, 10)

  if (isNaN(stage) || isNaN(batch)) return null

  return { stage, batch }
}

import type { Task } from "../lib/types.ts"

/**
 * Find the next incomplete batch based on tasks
 */
export function findNextIncompleteBatch(tasks: Task[]): string | null {
  // Group tasks by batch ID "SS.BB"
  const batches = new Map<string, Task[]>()

  for (const task of tasks) {
    try {
      const parsed = parseTaskId(task.id)
      if (!parsed) continue

      const batchId = `${parsed.stage.toString().padStart(2, "0")}.${parsed.batch.toString().padStart(2, "0")}`

      if (!batches.has(batchId)) {
        batches.set(batchId, [])
      }
      batches.get(batchId)!.push(task)
    } catch {
      // Ignore invalid task IDs
    }
  }

  // Sort batch IDs to check in order
  const sortedBatchIds = Array.from(batches.keys()).sort()

  // Find first batch that is not fully complete
  for (const batchId of sortedBatchIds) {
    const batchTasks = batches.get(batchId)!

    // Check if all tasks in this batch are completed or cancelled
    const allDone = batchTasks.every(
      (t) => t.status === "completed" || t.status === "cancelled",
    )

    if (!allDone) {
      return batchId
    }
  }

  return null
}

/**
 * Build the prompt file path for a thread using metadata strings
 * Used when discovering threads from tasks.json instead of PLAN.md
 */
function getPromptFilePathFromMetadata(
  repoRoot: string,
  streamId: string,
  stageNum: number,
  stageName: string,
  batchNum: number,
  batchName: string,
  threadName: string,
): string {
  const workDir = getWorkDir(repoRoot)

  const safeStageName = stageName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const safeBatchName = batchName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const safeThreadName = threadName
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .toLowerCase()

  const stagePrefix = stageNum.toString().padStart(2, "0")
  const batchPrefix = batchNum.toString().padStart(2, "0")

  return join(
    workDir,
    streamId,
    "prompts",
    `${stagePrefix}-${safeStageName}`,
    `${batchPrefix}-${safeBatchName}`,
    `${safeThreadName}.md`,
  )
}

/**
 * Build the pane title for a thread, including issue number if available
 */
function buildPaneTitle(threadInfo: ThreadInfo): string {
  if (threadInfo.githubIssue) {
    return `${threadInfo.threadName} (#${threadInfo.githubIssue.number})`
  }
  return threadInfo.threadName
}

/**
 * Collect thread information from tasks.json (not PLAN.md)
 * Discovers threads dynamically from tasks, including dynamically added ones
 */
function collectThreadInfoFromTasks(
  repoRoot: string,
  streamId: string,
  stageNum: number,
  batchNum: number,
  agentsConfig: ReturnType<typeof loadAgentsConfig>,
): ThreadInfo[] {
  const discoveredThreads = discoverThreadsInBatch(
    repoRoot,
    streamId,
    stageNum,
    batchNum,
  )
  if (!discoveredThreads || discoveredThreads.length === 0) {
    return []
  }

  const threads: ThreadInfo[] = []

  for (const discovered of discoveredThreads) {
    // Get prompt path from task metadata
    const promptPath = getPromptFilePathFromMetadata(
      repoRoot,
      streamId,
      discovered.stageNum,
      discovered.stageName,
      discovered.batchNum,
      discovered.batchName,
      discovered.threadName,
    )

    // Get agent (from task or default)
    const agentName = discovered.assignedAgent || "default"

    // Get models from agent (for retry logic)
    const models = getAgentModels(agentsConfig!, agentName)
    if (models.length === 0) {
      console.error(
        `Error: Agent "${agentName}" not found in agents.yaml (referenced in thread ${discovered.threadId})`,
      )
      process.exit(1)
    }

    threads.push({
      threadId: discovered.threadId,
      threadName: discovered.threadName,
      stageName: discovered.stageName,
      batchName: discovered.batchName,
      promptPath,
      models,
      agentName,
      githubIssue: discovered.githubIssue,
      firstTaskId: discovered.firstTaskId,
    })
  }

  return threads
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (!cliArgs.batch && !cliArgs.continue) {
    console.error("Error: Either --batch or --continue is required")
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

  // Resolve batch ID
  let batchId = cliArgs.batch

  if (cliArgs.continue) {
    const tasksFile = readTasksFile(repoRoot, stream.id)
    if (!tasksFile) {
      console.error(`Error: No tasks found for stream ${stream.id}`)
      process.exit(1)
    }

    const nextBatch = findNextIncompleteBatch(tasksFile.tasks)
    if (!nextBatch) {
      console.log("All batches are complete! Nothing to continue.")
      process.exit(0)
    }

    batchId = nextBatch
    console.log(`Continuing with next incomplete batch: ${batchId}`)
  }

  if (!batchId) {
    console.error(
      "Error: No batch specified and could not determine next batch",
    )
    process.exit(1)
  }

  // Parse batch ID
  const batchParsed = parseBatchId(batchId)
  if (!batchParsed) {
    console.error(
      `Error: Invalid batch ID "${batchId}". Expected format: "SS.BB" (e.g., "01.02")`,
    )
    process.exit(1)
  }

  // Check Previous Stage Approval
  // If we are running a batch in stage N (where N > 1), stage N-1 must be approved
  if (batchParsed.stage > 1) {
    const prevStageNum = batchParsed.stage - 1
    const approvalStatus = getStageApprovalStatus(stream, prevStageNum)

    if (approvalStatus !== "approved") {
      console.error(
        `Error: Previous stage (Stage ${prevStageNum}) is not approved.`,
      )
      console.error(
        `\nYou must approve the outputs of Stage ${prevStageNum} before proceeding to Stage ${batchParsed.stage}.`,
      )
      console.error(`Run: work approve stage ${prevStageNum}`)
      process.exit(1)
    }
  }

  // Load agents config
  const agentsConfig = loadAgentsConfig(repoRoot)
  if (!agentsConfig) {
    console.error("Error: No agents.yaml found. Run 'work init' to create one.")
    process.exit(1)
  }

  // Discover threads from tasks.json (not PLAN.md)
  // This ensures dynamically added tasks/threads are included
  const threads = collectThreadInfoFromTasks(
    repoRoot,
    stream.id,
    batchParsed.stage,
    batchParsed.batch,
    agentsConfig,
  )

  if (threads.length === 0) {
    console.error(
      `Error: No tasks found for batch ${batchId} in stream ${stream.id}`,
    )
    console.error(`\nHint: Make sure tasks.json has tasks for this batch.`)
    process.exit(1)
  }

  if (threads.length > MAX_THREADS_PER_BATCH) {
    console.error(
      `Error: Batch has ${threads.length} threads, but max is ${MAX_THREADS_PER_BATCH}`,
    )
    console.error(
      `\nHint: Split this batch into smaller batches or increase MAX_THREADS_PER_BATCH.`,
    )
    process.exit(1)
  }

  // Get batch metadata for display (stage/batch names)
  const batchMeta = getBatchMetadata(
    repoRoot,
    stream.id,
    batchParsed.stage,
    batchParsed.batch,
  )
  const stageName = batchMeta?.stageName || `Stage ${batchParsed.stage}`
  const batchName = batchMeta?.batchName || `Batch ${batchParsed.batch}`

  // Check all prompts exist
  const missingPrompts: string[] = []
  for (const thread of threads) {
    if (!existsSync(thread.promptPath)) {
      missingPrompts.push(`  ${thread.threadId}: ${thread.promptPath}`)
    }
  }

  if (missingPrompts.length > 0) {
    console.error("Error: Missing prompt files:")
    for (const msg of missingPrompts) {
      console.error(msg)
    }
    console.error(
      `\nHint: Run 'work prompt --stage ${batchParsed.stage} --batch ${batchParsed.batch}' to generate them.`,
    )
    process.exit(1)
  }

  const port = cliArgs.port ?? DEFAULT_PORT
  const sessionName = getWorkSessionName(stream.id)

  // === DRY RUN MODE ===
  if (cliArgs.dryRun) {
    console.log("=== DRY RUN ===\n")
    console.log(`Stream: ${stream.id}`)
    console.log(`Batch: ${batchId} (${stageName} -> ${batchName})`)
    console.log(`Threads: ${threads.length}`)
    console.log(`Session: ${sessionName}`)
    console.log(`Port: ${port}`)
    console.log("")

    if (!cliArgs.noServer) {
      console.log("# Start opencode serve")
      console.log(buildServeCommand(port))
      console.log("")
    }

    console.log("# Create tmux session (Window 0: Dashboard)")
    const firstThread = threads[0]!
    const firstCmd = buildRetryRunCommand(
      port,
      firstThread.models,
      firstThread.promptPath,
      buildPaneTitle(firstThread),
    )
    console.log(buildCreateSessionCommand(sessionName, "Dashboard", firstCmd))
    console.log("")

    console.log("# Add thread windows (Background)")
    if (threads.length > 1) {
      for (let i = 1; i < threads.length; i++) {
        const thread = threads[i]!
        const cmd = buildRetryRunCommand(
          port,
          thread.models,
          thread.promptPath,
          buildPaneTitle(thread),
        )
        // Use thread ID as window name
        console.log(buildAddWindowCommand(sessionName, thread.threadId, cmd))
      }
      console.log("")
    }

    console.log("# Setup Dashboard Layout")
    const navigatorCmd = `bun work multi-navigator --session "${sessionName}" --batch "${batchId}" --repo-root "${repoRoot}" --stream "${stream.id}"`
    console.log(
      `tmux split-window -t "${sessionName}:0" -h -b -l 25% "${navigatorCmd}"`,
    )
    console.log("")

    console.log("# Attach to session")
    console.log(buildAttachCommand(sessionName))
    console.log("")

    console.log("=== Thread Details ===")
    for (const thread of threads) {
      console.log(`\n${thread.threadId}: ${thread.threadName}`)
      console.log(`  Agent: ${thread.agentName}`)
      console.log(`  Models: ${thread.models.map((m) => m.model).join(" → ")}`)
      console.log(`  Prompt: ${thread.promptPath}`)
      if (thread.githubIssue) {
        console.log(`  Issue: ${thread.githubIssue.url}`)
      }
    }

    return
  }

  // === REAL EXECUTION ===

  // Check if session already exists
  if (sessionExists(sessionName)) {
    console.error(`Error: tmux session "${sessionName}" already exists.`)
    console.error(`\nOptions:`)
    console.error(`  1. Attach to it: tmux attach -t "${sessionName}"`)
    console.error(`  2. Kill it: tmux kill-session -t "${sessionName}"`)
    process.exit(1)
  }

  // Generate session IDs for each thread before spawning
  console.log("Generating session IDs for thread tracking...")
  for (const thread of threads) {
    thread.sessionId = generateSessionId()
  }

  // Start sessions in tasks.json (atomically, with locking)
  const sessionsToStart = threads
    .filter((t) => t.firstTaskId && t.sessionId)
    .map((t) => ({
      taskId: t.firstTaskId!,
      agentName: t.agentName,
      model: t.models[0]?.model || "unknown",
      sessionId: t.sessionId!,
    }))

  if (sessionsToStart.length > 0) {
    console.log(`Starting ${sessionsToStart.length} sessions in tasks.json...`)
    await startMultipleSessionsLocked(repoRoot, stream.id, sessionsToStart)
  }

  // Track pane IDs for each thread (populated after spawn)
  const threadSessionMap: ThreadSessionMap[] = []

  // Start opencode serve if needed
  if (!cliArgs.noServer) {
    const serverRunning = await isServerRunning(port)
    if (!serverRunning) {
      console.log(`Starting opencode serve on port ${port}...`)
      startServer(port, repoRoot)

      console.log("Waiting for server to be ready...")
      const ready = await waitForServer(port, 30000)
      if (!ready) {
        console.error(`Error: opencode serve did not start within 30 seconds`)
        process.exit(1)
      }
      console.log("Server ready.\n")
    } else {
      console.log(`opencode serve already running on port ${port}\n`)
    }
  }

  // Create tmux session with first thread
  console.log(`Creating tmux session "${sessionName}"...`)

  // === 2x2 GRID LAYOUT ===
  // Window 0: Grid with up to 4 visible threads
  // Windows 1+: Hidden windows for threads 5+ (for pagination)

  const firstThread = threads[0]!
  const firstCmd = buildRetryRunCommand(
    port,
    firstThread.models,
    firstThread.promptPath,
    buildPaneTitle(firstThread),
  )

  // Create session with first thread in Window 0
  createSession(sessionName, "Grid", firstCmd)
  Bun.sleepSync(THREAD_START_DELAY_MS)

  // Keep windows open after exit for debugging
  setGlobalOption(sessionName, "remain-on-exit", "on")
  // Enable mouse support for scrolling
  setGlobalOption(sessionName, "mouse", "on")

  console.log(`  Grid: Thread 1 - ${firstThread.threadName}`)

  // Build commands for threads 2-4 (remaining visible grid panes)
  const gridCommands = [firstCmd]
  for (let i = 1; i < Math.min(4, threads.length); i++) {
    const thread = threads[i]!
    const cmd = buildRetryRunCommand(
      port,
      thread.models,
      thread.promptPath,
      buildPaneTitle(thread),
    )
    gridCommands.push(cmd)
    console.log(`  Grid: Thread ${i + 1} - ${thread.threadName}`)
  }

  // Create the grid layout (splits panes for threads 2-4)
  if (gridCommands.length > 1) {
    console.log("  Setting up 2x2 grid layout...")
    createGridLayout(`${sessionName}:0`, gridCommands)
  }

  // Capture pane IDs for threads in grid (window 0)
  const gridPaneIds = listPaneIds(`${sessionName}:0`)
  for (let i = 0; i < Math.min(4, threads.length); i++) {
    const thread = threads[i]!
    if (thread.sessionId && thread.firstTaskId && gridPaneIds[i]) {
      threadSessionMap.push({
        threadId: thread.threadId,
        sessionId: thread.sessionId,
        taskId: thread.firstTaskId,
        paneId: gridPaneIds[i]!,
        windowIndex: 0,
      })
    }
  }

  // Create hidden windows for threads 5+ (used by pagination)
  if (threads.length > 4) {
    console.log("  Creating hidden windows for pagination...")
    for (let i = 4; i < threads.length; i++) {
      const thread = threads[i]!
      const cmd = buildRetryRunCommand(
        port,
        thread.models,
        thread.promptPath,
        buildPaneTitle(thread),
      )
      const windowName = `T${i + 1}`
      addWindow(sessionName, windowName, cmd)
      console.log(`  Hidden: ${windowName} - ${thread.threadName}`)
      Bun.sleepSync(THREAD_START_DELAY_MS)

      // Capture pane ID for hidden window thread
      const windowPaneIds = listPaneIds(`${sessionName}:${windowName}`)
      if (thread.sessionId && thread.firstTaskId && windowPaneIds[0]) {
        threadSessionMap.push({
          threadId: thread.threadId,
          sessionId: thread.sessionId,
          taskId: thread.firstTaskId,
          paneId: windowPaneIds[0]!,
          windowIndex: i - 3, // Hidden windows start at index 1
        })
      }
    }
  }

  console.log(`  Tracking ${threadSessionMap.length} thread sessions`)

  // Add status bar at bottom for grid controller (if >4 threads for pagination)
  if (threads.length > 4) {
    console.log("  Setting up grid controller for pagination...")
    const bunPath = process.execPath
    const { resolve } = await import("path")
    const binPath = resolve(import.meta.dir, "../../bin/work.ts")

    // Build thread command environment variables for respawn
    const threadCmdEnv = threads
      .map((t, i) => {
        const cmd = buildRetryRunCommand(
          port,
          t.models,
          t.promptPath,
          buildPaneTitle(t),
        )
        return `THREAD_CMD_${i + 1}="${cmd}"`
      })
      .join(" ")

    // Exit code 42 = intentional quit (don't restart)
    const loopCmd = `while true; do ${threadCmdEnv} "${bunPath}" "${binPath}" multi-grid --session "${sessionName}" --batch "${batchId}" --repo-root "${repoRoot}" --stream "${stream.id}"; exitCode=$?; if [ $exitCode -eq 42 ]; then exit 0; fi; echo "Controller crashed. Restarting in 1s..."; sleep 1; done`

    // Create a small pane at the bottom for the grid controller
    const splitArgs = [
      "tmux",
      "split-window",
      "-t",
      `${sessionName}:0`,
      "-v",
      "-l",
      "3", // 3 lines at bottom
      loopCmd,
    ]
    Bun.spawnSync(splitArgs)
  }

  // === KEYBINDING TO KILL SESSION ===
  // Bind Ctrl+b X to kill the session instantly (capital X)
  Bun.spawnSync(["tmux", "bind-key", "X", "kill-session"])

  console.log(`
Layout: ${threads.length <= 4 ? "2x2 Grid (all visible)" : `2x2 Grid with pagination (${threads.length} threads, use n/p to page)`}
Press Ctrl+b X to kill the session when done.
`)

  console.log(`Attaching to session "${sessionName}"...`)

  // Attach to session (this takes over the terminal)
  const child = attachSession(sessionName)

  child.on("close", async (code) => {
    console.log(`\nSession detached. Checking thread statuses...`)

    const completions: Array<{
      taskId: string
      sessionId: string
      status: "completed" | "failed" | "interrupted"
      exitCode?: number
    }> = []

    // Track completion stats for notifications
    let completedCount = 0
    let failedCount = 0
    let runningCount = 0

    // Update session statuses based on pane exit codes
    if (threadSessionMap.length > 0) {
      if (sessionExists(sessionName)) {
        // Session still exists - check individual pane statuses
        const paneStatuses = getSessionPaneStatuses(sessionName)

        for (const mapping of threadSessionMap) {
          const paneStatus = paneStatuses.find((p) => p.paneId === mapping.paneId)
          if (paneStatus && paneStatus.paneDead) {
            const exitCode = paneStatus.exitStatus ?? undefined
            const status = exitCode === 0 ? "completed" : "failed"
            completions.push({
              taskId: mapping.taskId,
              sessionId: mapping.sessionId,
              status,
              exitCode,
            })
            console.log(
              `  Thread ${mapping.threadId}: ${status}${exitCode !== undefined ? ` (exit ${exitCode})` : ""}`,
            )

            // Track stats and play notifications
            if (status === "completed") {
              completedCount++
              if (!cliArgs.silent) {
                playNotification("thread_complete")
              }
            } else {
              failedCount++
              if (!cliArgs.silent) {
                playNotification("error")
              }
            }
          } else if (paneStatus && !paneStatus.paneDead) {
            console.log(`  Thread ${mapping.threadId}: still running`)
            runningCount++
          } else {
            completions.push({
              taskId: mapping.taskId,
              sessionId: mapping.sessionId,
              status: "interrupted",
            })
            console.log(
              `  Thread ${mapping.threadId}: interrupted (pane not found)`,
            )
          }
        }

        console.log(`\nWindows remain in tmux session "${sessionName}".`)
        console.log(`To reattach: tmux attach -t "${sessionName}"`)
        console.log(`To kill: tmux kill-session -t "${sessionName}"`)
      } else {
        // Session was killed via Ctrl+b X - user confirmed threads are done
        console.log("Session closed. Marking all threads as completed...")
        for (const mapping of threadSessionMap) {
          completions.push({
            taskId: mapping.taskId,
            sessionId: mapping.sessionId,
            status: "completed",
          })
          console.log(`  Thread ${mapping.threadId}: completed`)
          completedCount++
          if (!cliArgs.silent) {
            playNotification("thread_complete")
          }
        }
      }

      // Play batch_complete if all threads finished (no running threads)
      if (runningCount === 0 && completions.length > 0 && !cliArgs.silent) {
        // Small delay so batch sound plays after thread sounds
        await Bun.sleep(100)
        playNotification("batch_complete")
      }

      if (completions.length > 0) {
        console.log(
          `\nUpdating ${completions.length} session statuses in tasks.json...`,
        )
        await completeMultipleSessionsLocked(repoRoot, stream.id, completions)
      }
    }

    process.exit(code ?? 0)
  })

  child.on("error", (err) => {
    console.error(`Error attaching to tmux session: ${err.message}`)
    if (!cliArgs.silent) {
      playNotification("error")
    }
    process.exit(1)
  })
}

// Run if called directly
if (import.meta.main) {
  await main()
}
