/**
 * CLI: Workstream Tree
 *
 * Show a tree view of the workstream stages, batches, and threads.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getTasks, groupTasksByStageAndBatchAndThread } from "../lib/tasks.ts"
import type { Task, TaskStatus } from "../lib/types.ts"

interface TreeCliArgs {
    repoRoot?: string
    streamId?: string
}

function printHelp(): void {
    console.log(`
work tree - Show workstream structure tree

Usage:
  work tree [--stream <stream-id>]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --help, -h       Show this help message

Examples:
  work tree
  work tree --stream "001-migration"
`)
}

function parseCliArgs(argv: string[]): TreeCliArgs | null {
    const args = argv.slice(2)
    const parsed: TreeCliArgs = {}

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

            case "--help":
            case "-h":
                printHelp()
                process.exit(0)
        }
    }

    return parsed
}

/**
 * Aggregate status from a list of tasks
 * Precedence: Blocked > In Progress > Pending > Completed
 * (Completed only if ALL are completed/cancelled)
 */
function aggregateStatus(tasks: Task[]): TaskStatus {
    if (tasks.length === 0) return "pending"

    if (tasks.some((t) => t.status === "blocked")) return "blocked"
    if (tasks.some((t) => t.status === "in_progress")) return "in_progress"

    // If any task is pending, the container is pending
    if (tasks.some((t) => t.status === "pending")) return "pending"

    // If we're here, all tasks are either completed or cancelled
    return "completed"
}

function statusToIcon(status: TaskStatus): string {
    switch (status) {
        case "completed":
            return "[x]"
        case "in_progress":
            return "[~]"
        case "blocked":
            return "[!]"
        case "pending":
            return "[ ]"
        case "cancelled":
            return "[-]"
        default:
            return "[ ]"
    }
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

    // Load index and find workstream (uses current if not specified)
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

    // Get tasks and group them
    const tasks = getTasks(repoRoot, stream.id)
    if (tasks.length === 0) {
        console.log(`Workstream: ${stream.id} (Empty)`)
        return
    }

    const grouped = groupTasksByStageAndBatchAndThread(tasks)

    // Calculate overall status
    const streamStatus = aggregateStatus(tasks)
    console.log(`${statusToIcon(streamStatus)} Workstream: ${stream.id} (${tasks.length})`)

    // Iterate Stages
    // Sort stages by numeric prefix (Map iteration order is insertion order, but better to be safe)
    const sortedStages = Array.from(grouped.entries()).sort((a, b) => {
        // Trying to extract stage number from the first task of the stage
        // Just a heuristic sort based on stage name if we can't get ID easily, 
        // but typically stage names don't have numbers at start.
        // However, the grouping function returns Map<StageName, ...>
        // We rely on the order returned by groupTasksByStageAndBatchAndThread 
        // which might be effectively sorted if tasks were sorted.

        // Let's try to find numeric tasks to sort robustly
        // Actually groupTasksByStageAndBatchAndThread preserves insertion order 
        // but tasks.ts doesn't guarantee stage sort order in the Map keys.
        // We'll trust the insertion order for now or sort by name if needed.
        // Better: finding the first task of each stage to compare IDs.
        const taskA = a[1].values().next().value?.values().next().value?.[0]; // Stage -> Batch -> Thread -> Task[]
        const taskB = b[1].values().next().value?.values().next().value?.[0];
        if (taskA && taskB) {
            return taskA.id.localeCompare(taskB.id);
        }
        return a[0].localeCompare(b[0]);
    });


    for (const [stageIndex, [stageName, batchMap]] of sortedStages.entries()) {
        const isLastStage = stageIndex === sortedStages.length - 1
        const stagePrefix = isLastStage ? "└── " : "├── "
        const stageChildPrefix = isLastStage ? "    " : "│   "

        // Aggregate stage tasks
        const stageTasks: Task[] = []
        for (const batch of batchMap.values()) {
            for (const thread of batch.values()) {
                stageTasks.push(...thread)
            }
        }
        const stageStatus = aggregateStatus(stageTasks)

        // Extract stage number from first task ID
        const firstTask = stageTasks[0]
        const stageNum = firstTask ? firstTask.id.split('.')[0] : "?"

        console.log(`${stagePrefix}${statusToIcon(stageStatus)} Stage ${stageNum}: ${stageName} (${stageTasks.length})`)

        const sortedBatches = Array.from(batchMap.entries()).sort((a, b) => {
            const taskA = a[1].values().next().value?.[0];
            const taskB = b[1].values().next().value?.[0];
            if (taskA && taskB) {
                return taskA.id.localeCompare(taskB.id);
            }
            return a[0].localeCompare(b[0]);
        });

        for (const [batchIndex, [batchName, threadMap]] of sortedBatches.entries()) {
            const isLastBatch = batchIndex === sortedBatches.length - 1
            const batchPrefix = isLastBatch ? "└── " : "├── "
            const batchChildPrefix = isLastBatch ? "    " : "│   "

            // Aggregate batch tasks
            const batchTasks: Task[] = []
            for (const thread of threadMap.values()) {
                batchTasks.push(...thread)
            }
            const batchStatus = aggregateStatus(batchTasks)

            // Extract batch number
            const firstBatchTask = batchTasks[0]
            const batchNum = firstBatchTask ? firstBatchTask.id.split('.')[1] : "?"

            console.log(`${stageChildPrefix}${batchPrefix}${statusToIcon(batchStatus)} Batch ${batchNum}: ${batchName} (${batchTasks.length})`)

            const sortedThreads = Array.from(threadMap.entries()).sort((a, b) => {
                const taskA = a[1][0];
                const taskB = b[1][0];
                if (taskA && taskB) return taskA.id.localeCompare(taskB.id);
                return a[0].localeCompare(b[0]);
            });

            for (const [threadIndex, [threadName, tasks]] of sortedThreads.entries()) {
                const isLastThread = threadIndex === sortedThreads.length - 1
                const threadPrefix = isLastThread ? "└── " : "├── "

                const threadStatus = aggregateStatus(tasks)
                const threadNum = tasks[0] ? tasks[0].id.split('.')[2] : "?"

                console.log(`${stageChildPrefix}${batchChildPrefix}${threadPrefix}${statusToIcon(threadStatus)} Thread ${threadNum}: ${threadName} (${tasks.length})`)
            }
        }
    }
}

if (import.meta.main) {
    main()
}
