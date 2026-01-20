/**
 * CLI: Execute
 *
 * Executes a thread prompt via opencode with the assigned agent's model.
 */

import { join } from "path"
import { existsSync, readFileSync } from "fs"
import { spawn } from "child_process"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getAgentsConfig, getAgent } from "../lib/agents.ts"
import { readTasksFile, parseTaskId } from "../lib/tasks.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"

interface ExecuteCliArgs {
    repoRoot?: string
    streamId?: string
    threadId?: string
    agent?: string
    dryRun?: boolean
}

function printHelp(): void {
    console.log(`
work execute - Execute a thread prompt via opencode

Usage:
  work execute --thread "01.01.01" [options]

Required:
  --thread, -t     Thread ID in "stage.batch.thread" format (e.g., "01.01.02")

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --agent, -a      Override agent (uses thread's assigned agent if not specified)
  --dry-run        Show the command that would be run without executing
  --repo-root, -r  Repository root (auto-detected if omitted)
  --help, -h       Show this help message

Description:
  Executes a thread by piping its prompt to opencode with the correct model.
  The model is determined from the assigned agent's definition in AGENTS.md.

  The agent's model field must be in "provider/model" format, e.g.:
  - google/gemini-3-flash-preview
  - anthropic/claude-sonnet-4

Examples:
  work execute --thread "01.01.01"
  work execute --thread "01.01.01" --agent "backend-expert"
  work execute --thread "01.01.01" --dry-run
`)
}

function parseCliArgs(argv: string[]): ExecuteCliArgs | null {
    const args = argv.slice(2)
    const parsed: Partial<ExecuteCliArgs> = {}

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

            case "--thread":
            case "-t":
                if (!next) {
                    console.error("Error: --thread requires a value")
                    return null
                }
                parsed.threadId = next
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

            case "--dry-run":
                parsed.dryRun = true
                break

            case "--help":
            case "-h":
                printHelp()
                process.exit(0)
        }
    }

    return parsed as ExecuteCliArgs
}

/**
 * Build the prompt file path for a thread
 */
function getPromptFilePath(
    repoRoot: string,
    streamId: string,
    threadId: string
): string | null {
    const workDir = getWorkDir(repoRoot)
    const planPath = join(workDir, streamId, "PLAN.md")

    if (!existsSync(planPath)) {
        return null
    }

    const planContent = readFileSync(planPath, "utf-8")
    const errors: { message: string }[] = []
    const doc = parseStreamDocument(planContent, errors)

    if (!doc) {
        return null
    }

    // Parse thread ID: "01.02.03" -> stage 1, batch 2, thread 3
    const parts = threadId.split(".").map((p) => parseInt(p, 10))
    if (parts.length !== 3 || parts.some(isNaN)) {
        return null
    }
    const [stageNum, batchNum, threadNum] = parts

    const stage = doc.stages.find((s) => s.id === stageNum)
    if (!stage) return null

    const batch = stage.batches.find((b) => b.id === batchNum)
    if (!batch) return null

    const thread = batch.threads.find((t) => t.id === threadNum)
    if (!thread) return null

    // Build path matching prompt.ts logic
    const safeStageName = stage.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
    const safeBatchName = batch.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
    const safeThreadName = thread.name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()

    const stagePrefix = stageNum!.toString().padStart(2, "0")

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
 */
function getThreadAssignedAgent(
    repoRoot: string,
    streamId: string,
    threadId: string
): string | undefined {
    const tasksFile = readTasksFile(repoRoot, streamId)
    if (!tasksFile) return undefined

    // Parse thread ID to match task IDs that belong to this thread
    const parts = threadId.split(".").map((p) => parseInt(p, 10))
    if (parts.length !== 3) return undefined
    const [stageNum, batchNum, threadNum] = parts

    // Find first task in this thread that has an assigned agent
    for (const task of tasksFile.tasks) {
        try {
            const parsed = parseTaskId(task.id)
            if (parsed.stage === stageNum && parsed.batch === batchNum && parsed.thread === threadNum) {
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

export async function main(argv: string[] = process.argv): Promise<void> {
    const cliArgs = parseCliArgs(argv)
    if (!cliArgs) {
        console.error("\nRun with --help for usage information.")
        process.exit(1)
    }

    if (!cliArgs.threadId) {
        console.error("Error: --thread is required")
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

    // Get prompt file path
    const promptPath = getPromptFilePath(repoRoot, stream.id, cliArgs.threadId)
    if (!promptPath) {
        console.error(`Error: Could not find thread ${cliArgs.threadId} in stream ${stream.id}`)
        process.exit(1)
    }

    if (!existsSync(promptPath)) {
        console.error(`Error: Prompt file not found: ${promptPath}`)
        console.error(`\nHint: Run 'work prompt --thread "${cliArgs.threadId}"' to generate it first.`)
        process.exit(1)
    }

    // Determine agent
    let agentName = cliArgs.agent
    if (!agentName) {
        agentName = getThreadAssignedAgent(repoRoot, stream.id, cliArgs.threadId)
    }

    if (!agentName) {
        // Default to "default" agent if no assignment
        agentName = "default"
    }

    // Get agent config
    const agentsConfig = getAgentsConfig(repoRoot)
    if (!agentsConfig) {
        console.error("Error: No AGENTS.md found. Run 'work init' to create one.")
        process.exit(1)
    }

    const agent = getAgent(agentsConfig, agentName)
    if (!agent) {
        console.error(`Error: Agent "${agentName}" not found in AGENTS.md`)
        console.error(`\nAvailable agents: ${agentsConfig.agents.map((a) => a.name).join(", ")}`)
        process.exit(1)
    }

    // Build and execute command
    const command = `cat "${promptPath}" | opencode run $1 --model "${agent.model}"`

    if (cliArgs.dryRun) {
        console.log("Would execute:")
        console.log(command)
        console.log(`\nAgent: ${agent.name}`)
        console.log(`Model: ${agent.model}`)
        console.log(`Prompt: ${promptPath}`)
        return
    }

    console.log(`Executing thread ${cliArgs.threadId} with agent "${agent.name}" (${agent.model})...`)
    console.log(`Prompt: ${promptPath}\n`)

    // Execute via shell to handle pipe
    const child = spawn("sh", ["-c", command], {
        stdio: "inherit",
        cwd: repoRoot,
    })

    child.on("close", (code) => {
        process.exit(code ?? 0)
    })

    child.on("error", (err) => {
        console.error(`Error executing command: ${err.message}`)
        process.exit(1)
    })
}

// Run if called directly
if (import.meta.main) {
    await main()
}
