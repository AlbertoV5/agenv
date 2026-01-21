/**
 * CLI: Add Batch
 *
 * Add a new batch to an existing stage in PLAN.md
 */

import { readFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { appendBatchToStage } from "../lib/plan-edit.ts"
import { getStreamPlanMdPath } from "../lib/consolidate.ts"
import { parseStreamDocument } from "../lib/stream-parser.ts"
import { resolveByNameOrIndex } from "../lib/utils.ts"
import type { ConsolidateError } from "../lib/types.ts"

interface AddBatchCliArgs {
  repoRoot?: string
  streamId?: string
  stage: string // Can be number or name
  name?: string
  summary?: string
  json: boolean
}

function printHelp(): void {
  console.log(`
work add-batch - Add a batch to a stage

Usage:
  work add-batch --stage <n> --name <name> [options]

Required:
  --stage          Stage number or name to add batch to (e.g., 1 or "setup")
  --name, -n       Batch name

Optional:
  --summary        Batch description
  --stream, -s     Workstream ID (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Adds a new batch to an existing stage in PLAN.md. The batch number is
  automatically assigned based on existing batches in the stage.

Examples:
  work add-batch --stage 1 --name "testing"
  work add-batch --stage 2 --name "integration" --summary "API integration tests"
`)
}

function parseCliArgs(argv: string[]): AddBatchCliArgs | null {
  const args = argv.slice(2)
  const parsed: AddBatchCliArgs = { stage: "", json: false }

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

  // Parse PLAN.md to resolve stage name to ID
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

  // Resolve stage name to ID
  let stageId: number
  try {
    const resolvedStage = resolveByNameOrIndex(cliArgs.stage, doc.stages, "Stage")
    stageId = resolvedStage.id
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  // Append the batch
  const result = appendBatchToStage(repoRoot, stream.id, {
    stageNumber: stageId,
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
        batch: result.batchNumber,
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
