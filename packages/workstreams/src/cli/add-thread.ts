/**
 * CLI: Add Thread
 *
 * Add a new thread to an existing batch in PLAN.md
 */

import { readFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { appendThreadToBatch } from "../lib/plan-edit.ts"
import { getStreamPlanMdPath } from "../lib/consolidate.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"
import { resolveByNameOrIndex } from "../lib/utils.ts"
import type { ConsolidateError } from "../lib/types.ts"

interface AddThreadCliArgs {
  repoRoot?: string
  streamId?: string
  stage: string // Can be number or name
  batch: string // Can be number or name
  name?: string
  summary?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work add-thread - Add a thread to a batch

Usage:
  work add-thread --stage <n> --batch <n> --name <name> [options]

Required:
  --stage          Stage number or name (e.g., 1 or "setup")
  --batch, -b      Batch number or name (e.g., 1 or "core-setup")
  --name, -n       Thread name

Optional:
  --summary        Thread description
  --stream, -s     Workstream ID (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Adds a new thread to an existing batch in PLAN.md. The thread number is
  automatically assigned based on existing threads in the batch.

Examples:
  work add-thread --stage 1 --batch 1 --name "unit tests"
  work add-thread --stage 2 --batch 1 --name "API client" --summary "REST API integration"
`)
}

function parseCliArgs(argv: string[]): AddThreadCliArgs | null {
  const args = argv.slice(2)
  const parsed: AddThreadCliArgs = { stage: "", batch: "", json: false }

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

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.stage = next
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

      case "--name":
      case "-n":
        if (!next) {
          console.error("Error: --name requires a value")
          return null
        }
        parsed.name = next
        i++
        break

      case "--summary":
        if (!next) {
          console.error("Error: --summary requires a value")
          return null
        }
        parsed.summary = next
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

  return parsed
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Validate required args
  if (cliArgs.stage === "") {
    console.error("Error: --stage is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (cliArgs.batch === "") {
    console.error("Error: --batch is required")
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (!cliArgs.name) {
    console.error("Error: --name is required")
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

  // Parse PLAN.md to resolve names to IDs
  const planMdPath = getStreamPlanMdPath(repoRoot, stream.id)
  let content: string
  try {
    content = readFileSync(planMdPath, "utf-8")
  } catch (e) {
    console.error(`Error: Could not read PLAN.md: ${(e as Error).message}`)
    process.exit(1)
  }

  const errors: ConsolidateError[] = []
  const doc = parseStreamDocument(content, errors)

  if (!doc || doc.stages.length === 0) {
    console.error("Error: No stages found in PLAN.md")
    process.exit(1)
  }

  // Resolve stage and batch names to IDs
  let stageId: number
  let batchId: number
  try {
    const resolvedStage = resolveByNameOrIndex(cliArgs.stage, doc.stages, "Stage")
    stageId = resolvedStage.id

    const selectedStage = doc.stages.find((s) => s.id === stageId)!
    const resolvedBatch = resolveByNameOrIndex(
      cliArgs.batch,
      selectedStage.batches,
      "Batch",
    )
    batchId = resolvedBatch.id
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Append the thread
  const result = appendThreadToBatch(repoRoot, stream.id, {
    stageNumber: stageId,
    batchNumber: batchId,
    name: cliArgs.name,
    summary: cliArgs.summary,
  })

  if (!result.success) {
    console.error(`Error: ${result.message}`)
    process.exit(1)
  }

  if (cliArgs.json) {
    console.log(
      JSON.stringify({
        success: true,
        stream: stream.id,
        stage: stageId,
        batch: batchId,
        thread: result.threadNumber,
        name: cliArgs.name,
      }, null, 2)
    )
  } else {
    console.log(result.message)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
