/**
 * CLI: Multi
 *
 * Executes all threads in a batch in parallel using tmux sessions.
 * Each thread runs in its own tmux window with an opencode instance
 * connected to a shared opencode serve backend.
 */

import { join } from "path"
import { existsSync, readFileSync } from "fs"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getAgentsConfig, getAgent } from "../lib/agents.ts"
import { readTasksFile, parseTaskId } from "../lib/tasks.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"
import type { StreamDocument, BatchDefinition, StageDefinition, ThreadDefinition } from "../lib/types.ts"
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
} from "../lib/tmux.ts"
import {
    isServerRunning,
    startServer,
    waitForServer,
    buildRunCommand,
    buildServeCommand,
} from "../lib/opencode.ts"

const DEFAULT_PORT = 4096

interface MultiCliArgs {
    repoRoot?: string
    streamId?: string
    batch?: string
    port?: number
    dryRun?: boolean
    noServer?: boolean
}

interface ThreadInfo {
    threadId: string // "01.01.01"
    threadName: string
    stageName: string
    batchName: string
    promptPath: string
    model: string
    agentName: string
}

function printHelp(): void {
    console.log(`
work multi - Execute all threads in a batch in parallel

Usage:
  work multi --batch "01.01" [options]

Required:
  --batch, -b      Batch ID to execute (format: "SS.BB", e.g., "01.02")

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --port, -p       OpenCode server port (default: 4096)
  --dry-run        Show commands without executing
  --no-server      Skip starting opencode serve (assume already running)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Executes all threads in a batch simultaneously in parallel using tmux.
  Each thread runs in its own tmux window with a full opencode TUI.

  A shared opencode serve backend is started (unless --no-server) to
  eliminate MCP cold boot times and share model cache across threads.

Examples:
  work multi --batch "01.01"
  work multi --batch "01.01" --dry-run
  work multi --batch "02.01" --no-server
  work multi --batch "01.01" --port 5000
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
function parseBatchId(batchId: string): { stage: number; batch: number } | null {
    const parts = batchId.split(".")
    if (parts.length !== 2) return null

    const stage = parseInt(parts[0]!, 10)
    const batch = parseInt(parts[1]!, 10)

    if (isNaN(stage) || isNaN(batch)) return null

    return { stage, batch }
}

/**
 * Find a batch in the parsed stream document
 */
function findBatch(
    doc: StreamDocument,
    stageNum: number,
    batchNum: number
): { stage: StageDefinition; batch: BatchDefinition } | null {
    const stage = doc.stages.find((s) => s.id === stageNum)
    if (!stage) return null

    const batch = stage.batches.find((b) => b.id === batchNum)
    if (!batch) return null

    return { stage, batch }
}

/**
 * Build the prompt file path for a thread
 */
function getPromptFilePath(
    repoRoot: string,
    streamId: string,
    stage: StageDefinition,
    batch: BatchDefinition,
    thread: ThreadDefinition
): string {
    const workDir = getWorkDir(repoRoot)

    const safeStageName = stage.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
    const safeBatchName = batch.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
    const safeThreadName = thread.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()

    const stagePrefix = stage.id.toString().padStart(2, "0")

    return join(
        workDir,
        streamId,
        "prompts",
        `${stagePrefix}-${safeStageName}`,
        `${batch.prefix}-${safeBatchName}`,
        `${safeThreadName}.md`
    )
}

/**
 * Get the assigned agent name for a thread from tasks.json
 * Looks at the first task in the thread
 */
function getThreadAssignedAgent(
    repoRoot: string,
    streamId: string,
    stageNum: number,
    batchNum: number,
    threadNum: number
): string | undefined {
    const tasksFile = readTasksFile(repoRoot, streamId)
    if (!tasksFile) return undefined

    // Find first task in this thread that has an assigned agent
    for (const task of tasksFile.tasks) {
        try {
            const parsed = parseTaskId(task.id)
            if (
                parsed.stage === stageNum &&
                parsed.batch === batchNum &&
                parsed.thread === threadNum
            ) {
                if (task.assigned_agent) {
                    return task.assigned_agent
                }
            }
        } catch {
            // Skip invalid task IDs
        }
    }

    return undefined
}

/**
 * Collect thread information for all threads in a batch
 */
function collectThreadInfo(
    repoRoot: string,
    streamId: string,
    doc: StreamDocument,
    stage: StageDefinition,
    batch: BatchDefinition,
    agentsConfig: ReturnType<typeof getAgentsConfig>
): ThreadInfo[] {
    const threads: ThreadInfo[] = []

    for (const thread of batch.threads) {
        const stageNum = stage.id
        const batchNum = batch.id
        const threadNum = thread.id

        const threadId = [
            stageNum.toString().padStart(2, "0"),
            batchNum.toString().padStart(2, "0"),
            threadNum.toString().padStart(2, "0"),
        ].join(".")

        // Get prompt path
        const promptPath = getPromptFilePath(repoRoot, streamId, stage, batch, thread)

        // Get agent
        let agentName = getThreadAssignedAgent(repoRoot, streamId, stageNum, batchNum, threadNum)
        if (!agentName) {
            agentName = "default"
        }

        // Get model from agent
        let model = "anthropic/claude-sonnet-4" // fallback
        if (agentsConfig) {
            const agent = getAgent(agentsConfig, agentName)
            if (agent) {
                model = agent.model
            }
        }

        threads.push({
            threadId,
            threadName: thread.name,
            stageName: stage.name,
            batchName: batch.name,
            promptPath,
            model,
            agentName,
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

    if (!cliArgs.batch) {
        console.error("Error: --batch is required")
        console.error("\nRun with --help for usage information.")
        process.exit(1)
    }

    // Parse batch ID
    const batchParsed = parseBatchId(cliArgs.batch)
    if (!batchParsed) {
        console.error(`Error: Invalid batch ID "${cliArgs.batch}". Expected format: "SS.BB" (e.g., "01.02")`)
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

    // Load and parse PLAN.md
    const workDir = getWorkDir(repoRoot)
    const planPath = join(workDir, stream.id, "PLAN.md")

    if (!existsSync(planPath)) {
        console.error(`Error: PLAN.md not found for stream ${stream.id}`)
        process.exit(1)
    }

    const planContent = readFileSync(planPath, "utf-8")
    const errors: { message: string }[] = []
    const doc = parseStreamDocument(planContent, errors)

    if (!doc) {
        console.error("Error: Could not parse PLAN.md")
        if (errors.length > 0) {
            for (const err of errors) {
                console.error(`  - ${err.message}`)
            }
        }
        process.exit(1)
    }

    // Find the batch
    const batchResult = findBatch(doc, batchParsed.stage, batchParsed.batch)
    if (!batchResult) {
        console.error(`Error: Batch ${cliArgs.batch} not found in stream ${stream.id}`)
        console.error("\nAvailable batches:")
        for (const stage of doc.stages) {
            for (const batch of stage.batches) {
                const batchId = `${stage.id.toString().padStart(2, "0")}.${batch.id.toString().padStart(2, "0")}`
                console.error(`  ${batchId}: ${stage.name} / ${batch.name}`)
            }
        }
        process.exit(1)
    }

    const { stage, batch } = batchResult

    if (batch.threads.length === 0) {
        console.error(`Error: Batch ${cliArgs.batch} has no threads`)
        process.exit(1)
    }

    // Load agents config
    const agentsConfig = getAgentsConfig(repoRoot)
    if (!agentsConfig) {
        console.error("Error: No AGENTS.md found. Run 'work init' to create one.")
        process.exit(1)
    }

    // Collect thread information
    const threads = collectThreadInfo(repoRoot, stream.id, doc, stage, batch, agentsConfig)

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
        console.error(`\nHint: Run 'work prompt --stage ${batchParsed.stage} --batch ${batchParsed.batch}' to generate them.`)
        process.exit(1)
    }

    const port = cliArgs.port ?? DEFAULT_PORT
    const sessionName = getWorkSessionName(stream.id)

    // === DRY RUN MODE ===
    if (cliArgs.dryRun) {
        console.log("=== DRY RUN ===\n")
        console.log(`Stream: ${stream.id}`)
        console.log(`Batch: ${cliArgs.batch} (${stage.name} / ${batch.name})`)
        console.log(`Threads: ${threads.length}`)
        console.log(`Session: ${sessionName}`)
        console.log(`Port: ${port}`)
        console.log("")

        if (!cliArgs.noServer) {
            console.log("# Start opencode serve")
            console.log(buildServeCommand(port))
            console.log("")
        }

        console.log("# Create tmux session")
        const firstThread = threads[0]!
        const firstCmd = buildRunCommand(port, firstThread.model, firstThread.promptPath)
        console.log(buildCreateSessionCommand(sessionName, firstThread.threadId, firstCmd))
        console.log("")

        if (threads.length > 1) {
            console.log("# Add thread windows")
            for (let i = 1; i < threads.length; i++) {
                const thread = threads[i]!
                const cmd = buildRunCommand(port, thread.model, thread.promptPath)
                console.log(buildAddWindowCommand(sessionName, thread.threadId, cmd))
            }
            console.log("")
        }

        console.log("# Attach to session")
        console.log(buildAttachCommand(sessionName))
        console.log("")

        console.log("=== Thread Details ===")
        for (const thread of threads) {
            console.log(`\n${thread.threadId}: ${thread.threadName}`)
            console.log(`  Agent: ${thread.agentName}`)
            console.log(`  Model: ${thread.model}`)
            console.log(`  Prompt: ${thread.promptPath}`)
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
    const firstThread = threads[0]!
    const firstCmd = buildRunCommand(port, firstThread.model, firstThread.promptPath)

    createSession(sessionName, firstThread.threadId, firstCmd)
    console.log(`  Window: ${firstThread.threadId} - ${firstThread.threadName}`)

    // Add additional windows
    for (let i = 1; i < threads.length; i++) {
        const thread = threads[i]!
        const cmd = buildRunCommand(port, thread.model, thread.promptPath)
        addWindow(sessionName, thread.threadId, cmd)
        console.log(`  Window: ${thread.threadId} - ${thread.threadName}`)
    }

    // Select first window (index 0) before attaching
    selectWindow(sessionName, 0)

    console.log(`\nAttaching to session "${sessionName}"...`)
    console.log("Use Ctrl+B then number keys (0-9) to switch between windows.\n")

    // Attach to session (this takes over the terminal)
    const child = attachSession(sessionName)

    child.on("close", (code) => {
        console.log(`\nSession ended. Windows remain in tmux session "${sessionName}".`)
        console.log(`To reattach: tmux attach -t "${sessionName}"`)
        console.log(`To kill: tmux kill-session -t "${sessionName}"`)
        process.exit(code ?? 0)
    })

    child.on("error", (err) => {
        console.error(`Error attaching to tmux session: ${err.message}`)
        process.exit(1)
    })
}

// Run if called directly
if (import.meta.main) {
    await main()
}
