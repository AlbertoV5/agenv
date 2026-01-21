/**
 * CLI: Workstream Review
 *
 * Output PLAN.md or tasks for review.
 */

import { existsSync, readFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getStreamPlanMdPath } from "../lib/consolidate.ts"
import { getStreamPreview } from "../lib/stream-parser.ts"
import { getTasks } from "../lib/tasks.ts"

interface ReviewCliArgs {
    repoRoot?: string
    streamId?: string
    subcommand?: "plan" | "tasks"
    summary: boolean
    json: boolean
}

function printHelp(): void {
    console.log(`
work review - Review workstream artifacts

Usage:
  work review plan [--summary] [--stream <stream-id>]
  work review tasks [--stream <stream-id>]

Subcommands:
  plan     Output full PLAN.md content
  tasks    Output tasks from tasks.json (confirms state even if empty)

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --summary        For plan: show Stage/Batch structure only (no thread details)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Examples:
  # Review full PLAN.md
  work review plan

  # Review plan structure only (stages and batches)
  work review plan --summary

  # Review tasks
  work review tasks

  # Review as JSON
  work review plan --json
`)
}

function parseCliArgs(argv: string[]): ReviewCliArgs | null {
    const args = argv.slice(2)
    const parsed: ReviewCliArgs = { summary: false, json: false }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const next = args[i + 1]

        // Handle subcommand
        if (arg === "plan" && !parsed.subcommand) {
            parsed.subcommand = "plan"
            continue
        }
        if (arg === "tasks" && !parsed.subcommand) {
            parsed.subcommand = "tasks"
            continue
        }

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

            case "--summary":
                parsed.summary = true
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

function formatSummary(preview: ReturnType<typeof getStreamPreview>): string {
    const lines: string[] = []

    if (!preview.streamName) {
        return "Could not parse PLAN.md - invalid format"
    }

    lines.push(`# ${preview.streamName}`)
    lines.push("")

    for (const stage of preview.stages) {
        lines.push(`## Stage ${stage.number}: ${stage.name}`)
        for (const batch of stage.batches) {
            lines.push(`   - Batch ${batch.prefix}: ${batch.name} (${batch.threadCount} threads)`)
        }
        lines.push("")
    }

    const { open, resolved } = preview.questionCounts
    if (open > 0 || resolved > 0) {
        lines.push(`Open Questions: ${open} | Resolved: ${resolved}`)
    }

    return lines.join("\n")
}

export function main(argv: string[] = process.argv): void {
    const cliArgs = parseCliArgs(argv)
    if (!cliArgs) {
        console.error("\nRun with --help for usage information.")
        process.exit(1)
    }

    // Validate subcommand
    if (!cliArgs.subcommand) {
        console.error("Error: subcommand required (plan or tasks)")
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

    if (cliArgs.subcommand === "plan") {
        const planMdPath = getStreamPlanMdPath(repoRoot, stream.id)
        if (!existsSync(planMdPath)) {
            console.error(`Error: PLAN.md not found at ${planMdPath}`)
            process.exit(1)
        }

        const content = readFileSync(planMdPath, "utf-8")

        if (cliArgs.summary) {
            const preview = getStreamPreview(content)
            if (cliArgs.json) {
                console.log(JSON.stringify({
                    streamName: preview.streamName,
                    stageCount: preview.stageCount,
                    stages: preview.stages.map(s => ({
                        number: s.number,
                        name: s.name,
                        batches: s.batches.map(b => ({
                            prefix: b.prefix,
                            name: b.name,
                            threadCount: b.threadCount
                        }))
                    })),
                    questionCounts: preview.questionCounts
                }, null, 2))
            } else {
                console.log(formatSummary(preview))
            }
        } else {
            if (cliArgs.json) {
                console.log(JSON.stringify({ content }, null, 2))
            } else {
                console.log(content)
            }
        }
    } else if (cliArgs.subcommand === "tasks") {
        const tasks = getTasks(repoRoot, stream.id)

        if (cliArgs.json) {
            console.log(JSON.stringify({ tasks, count: tasks.length }, null, 2))
        } else {
            if (tasks.length === 0) {
                console.log("No tasks found.")
                console.log("\nUse 'work add-task' to add tasks to this workstream.")
            } else {
                console.log(`Tasks (${tasks.length} total):\n`)
                for (const task of tasks) {
                    const statusIcon = {
                        pending: "○",
                        in_progress: "◐",
                        completed: "●",
                        blocked: "⊘",
                        cancelled: "✗"
                    }[task.status] || "○"
                    console.log(`  ${statusIcon} ${task.id}: ${task.name}`)
                }
            }
        }
    }
}

// Run if called directly
if (import.meta.main) {
    main()
}
