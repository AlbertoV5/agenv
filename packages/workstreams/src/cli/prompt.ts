/**
 * CLI: Prompt
 *
 * Generates execution prompts for agents with full thread context.
 */

import { join } from "path"
import { appendFileSync } from "fs"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import {
  getPromptContext,
  generateThreadPrompt,
  generateThreadPromptJson,
} from "../lib/prompts.ts"

interface PromptCliArgs {
  repoRoot?: string
  streamId?: string
  threadId?: string
  stage?: string
  batch?: string
  json?: boolean
  noTests?: boolean
  noParallel?: boolean
}

function printHelp(): void {
  console.log(`
work prompt - Generate thread execution prompt for agents

Usage:
  work prompt --thread "01.01.01" [options]

Required:
  --thread, -t     Thread ID in "stage.batch.thread" format (e.g., "01.01.02")
  OR
  --stage, --batch Generate prompts for all threads in a batch

Required (one of):
  --thread         Thread ID
  --stage, --batch Stage and Batch numbers

Optional:
  --stream, -s     Workstream ID or name (uses current if not specified)
  --repo-root, -r  Repository root (auto-detected if omitted)
  --json, -j       Output as JSON instead of markdown
  --no-tests       Exclude test requirements section
  --no-parallel    Exclude parallel threads section
  --help, -h       Show this help message

Description:
  Generates a comprehensive execution prompt for an agent to work on a specific
  thread. The prompt includes:
  - Thread summary and details from PLAN.md
  - Tasks assigned to the thread
  - Stage definition and constitution
  - Parallel threads for awareness
  - Test requirements from work/TESTS.md (if present)

Examples:
  work prompt --thread "01.01.01"
  work prompt --thread "01.01.02" --stream "001-my-feature"
  work prompt --thread "01.01.01" --json
  work prompt --stage 1 --batch 1
  work prompt --stage 1 --batch 1
`)
}

function appendToPromptsFile(repoRoot: string, streamId: string, content: string, title: string) {
  const workDir = getWorkDir(repoRoot)
  const promptsPath = join(workDir, streamId, "PROMPTS.md")
  const timestamp = new Date().toISOString()

  const entry = `
<!-- ================================================================================================= -->
<!-- GENERATED PROMPT: ${title} -->
<!-- TIMESTAMP: ${timestamp} -->
<!-- ================================================================================================= -->

${content}
`

  try {
    appendFileSync(promptsPath, entry)
    console.warn(`Saved prompt to ${promptsPath}`)
  } catch (e) {
    console.warn(`Warning: Failed to save prompt to PROMPTS.md: ${(e as Error).message}`)
  }
}

function parseCliArgs(argv: string[]): PromptCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<PromptCliArgs> = {}

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

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        parsed.stage = next
        i++
        break

      case "--batch":
        if (!next) {
          console.error("Error: --batch requires a value")
          return null
        }
        parsed.batch = next
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--no-tests":
        parsed.noTests = true
        break

      case "--no-parallel":
        parsed.noParallel = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as PromptCliArgs
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  // Validate arguments
  if (!cliArgs.threadId && (!cliArgs.stage || !cliArgs.batch)) {
    console.error("Error: Either --thread OR (--stage AND --batch) is required")
    console.error('Example: work prompt --thread "01.01.01"')
    console.error('Example: work prompt --stage 1 --batch 1')
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

  // Handle single thread
  if (cliArgs.threadId) {
    let context
    try {
      context = getPromptContext(repoRoot, stream.id, cliArgs.threadId)
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`)
      process.exit(1)
    }

    if (cliArgs.json) {
      const json = generateThreadPromptJson(context)
      console.log(JSON.stringify(json, null, 2))
    } else {
      const prompt = generateThreadPrompt(context, {
        includeTests: !cliArgs.noTests,
        includeParallel: !cliArgs.noParallel,
      })
      console.log(prompt)
      appendToPromptsFile(repoRoot, stream.id, prompt, cliArgs.threadId)
    }
    return
  }

  // Handle batch
  if (cliArgs.stage && cliArgs.batch) {
    // We need to find all threads in this batch to generate prompts for them
    // Parse stage/batch numbers
    const stageNum = parseInt(cliArgs.stage, 10)
    const batchNum = parseInt(cliArgs.batch, 10)

    if (isNaN(stageNum) || isNaN(batchNum)) {
      console.error("Error: stage and batch must be numbers")
      process.exit(1)
    }

    // We need to look up the stream content to find threads
    // Since we don't have a direct "getBatch" function, we'll try to probe threads
    // starting from 1 until we fail.
    // A more robust way would be to parse PLAN.md, but probing is simpler given existing tools.
    // actually, let's use getPromptContext and handle errors to stop.

    // Better yet, let's look at `lib/stream-parser.ts` usage.
    // We can read PLAN.md and parse it.

    const { join } = await import("path")
    const { readFileSync, existsSync } = await import("fs")
    const { getWorkDir } = await import("../lib/repo.ts")
    const { parseStreamDocument } = await import("../lib/stream-parser.ts")

    const workDir = getWorkDir(repoRoot)
    const planPath = join(workDir, stream.id, "PLAN.md")

    if (!existsSync(planPath)) {
      console.error(`Error: PLAN.md not found at ${planPath}`)
      process.exit(1)
    }

    const planContent = readFileSync(planPath, "utf-8")
    const errors: any[] = []
    const doc = parseStreamDocument(planContent, errors)

    if (!doc) {
      console.error("Error parsing PLAN.md")
      process.exit(1)
    }

    const stage = doc.stages.find(s => s.id === stageNum)
    if (!stage) {
      console.error(`Error: Stage ${stageNum} not found`)
      process.exit(1)
    }

    const batch = stage.batches.find(b => b.id === batchNum)
    if (!batch) {
      console.error(`Error: Batch ${batchNum} not found in stage ${stageNum}`)
      process.exit(1)
    }

    // Generate prompts for all threads
    const results: any[] = []

    for (const thread of batch.threads) {
      const threadIdStr = `${stageNum.toString().padStart(2, '0')}.${batchNum.toString().padStart(2, '0')}.${thread.id.toString().padStart(2, '0')}`

      try {
        const context = getPromptContext(repoRoot, stream.id, threadIdStr)

        if (cliArgs.json) {
          results.push(generateThreadPromptJson(context))
        } else {
          const prompt = generateThreadPrompt(context, {
            includeTests: !cliArgs.noTests,
            includeParallel: !cliArgs.noParallel,
          })

          console.log(`--- START PROMPT: ${threadIdStr} ---`)
          console.log(prompt)
          console.log(`--- END PROMPT: ${threadIdStr} ---\n`)

          appendToPromptsFile(repoRoot, stream.id, prompt, threadIdStr)
        }
      } catch (e) {
        console.error(`Error generating prompt for ${threadIdStr}: ${(e as Error).message}`)
      }
    }

    if (cliArgs.json) {
      console.log(JSON.stringify(results, null, 2))
    }
  }
}

// Run if called directly
if (import.meta.main) {
  await main()
}
