#!/usr/bin/env bun
/**
 * Preview script: Fix Command Retry Flow
 * 
 * Tests the fix command retry flow by creating a mock failed thread
 * and demonstrating the --retry functionality.
 * 
 * Usage:
 *   bun run scripts/preview-fix.ts
 */

import { join } from "path"
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs"
import { spawn } from "child_process"
import {
  createEmptyTasksFile,
  writeTasksFile,
} from "../packages/workstreams/src/lib/tasks.ts"
import type { Task } from "../packages/workstreams/src/lib/types.ts"
import { getWorkDir } from "../packages/workstreams/src/lib/repo.ts"

const MOCK_STREAM_ID = "preview-fix-test"

interface CliArgs {
  help: boolean
  cleanup: boolean
}

function printHelp(): void {
  console.log(`
Preview: Fix Command Retry Flow

Tests the fix command retry flow by creating a mock failed thread
and demonstrating the --retry functionality.

Usage:
  bun run scripts/preview-fix.ts [options]

Options:
  --cleanup    Remove mock workstream data and exit
  --help, -h   Show this help message

Description:
  1. Creates a mock workstream with a failed thread
  2. Generates a simple prompt file
  3. Shows how to use 'work fix --retry' to retry the thread
  4. Demonstrates session tracking across retry attempts

Test Flow:
  - Creates mock workstream: ${MOCK_STREAM_ID}
  - Creates failed thread: 01.01.01
  - Creates prompt with simple task
  - User can test: work fix --thread 01.01.01 --retry

Cleanup:
  Run with --cleanup to remove mock data:
  bun run scripts/preview-fix.ts --cleanup
`)
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    cleanup: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]

    switch (arg) {
      case "--help":
      case "-h":
        args.help = true
        break

      case "--cleanup":
        args.cleanup = true
        break

      default:
        console.error(`Error: Unknown option ${arg}`)
        process.exit(1)
    }
  }

  return args
}

function createMockWorkstream(repoRoot: string) {
  const workDir = getWorkDir(repoRoot)
  const streamDir = join(workDir, MOCK_STREAM_ID)
  const promptsDir = join(streamDir, "prompts", "01-test-stage", "01-test-batch")

  // Create directory structure
  mkdirSync(promptsDir, { recursive: true })

  // Create PLAN.md
  const planContent = `# Preview Fix Test Workstream

This is a mock workstream for testing the fix command retry flow.

## Stage 1: Test Stage

### Batch 1: Test Batch

#### Thread 1: Test Thread
- Simple task that can be retried
- Tests fix command functionality
`
  writeFileSync(join(streamDir, "PLAN.md"), planContent)

  // Create prompt file
  const promptContent = `# Test Thread

You are working on the "Test Thread" thread of the "Preview Fix Test" workstream.

Your task:
- Say "Hello from test thread"
- List 3 numbers: 1, 2, 3
- Exit

This is a simple task to test the fix command retry flow.
`
  writeFileSync(join(promptsDir, "test-thread.md"), promptContent)

  // Create tasks.json with a failed thread
  const tasksFile = createEmptyTasksFile(MOCK_STREAM_ID)

  const mockTask: Task = {
    id: "01.01.01.01",
    name: "Simple task for testing fix command",
    thread_name: "Test Thread",
    batch_name: "Test Batch",
    stage_name: "Test Stage",
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    status: "in_progress",
    assigned_agent: "default",
    sessions: [
      {
        sessionId: "mock-session-failed-001",
        agentName: "default",
        model: "claude-3-5-haiku-latest",
        startedAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        completedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        status: "failed",
        exitCode: 1,
      },
    ],
    currentSessionId: "mock-session-failed-001",
  }

  tasksFile.tasks.push(mockTask)

  // Write tasks.json
  writeTasksFile(repoRoot, MOCK_STREAM_ID, tasksFile)

  return {
    streamDir,
    promptPath: join(promptsDir, "test-thread.md"),
    taskId: mockTask.id,
    threadId: "01.01.01",
  }
}

function cleanupMockWorkstream(repoRoot: string) {
  const workDir = getWorkDir(repoRoot)
  const streamDir = join(workDir, MOCK_STREAM_ID)

  if (existsSync(streamDir)) {
    console.log(`Removing mock workstream at: ${streamDir}`)
    rmSync(streamDir, { recursive: true, force: true })
    console.log("Cleanup complete.")
  } else {
    console.log("No mock workstream found. Nothing to clean up.")
  }
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  const repoRoot = process.cwd()

  // Handle cleanup
  if (args.cleanup) {
    cleanupMockWorkstream(repoRoot)
    process.exit(0)
  }

  console.log(`Preview: Fix Command Retry Flow\n`)

  // Create mock workstream
  console.log("Creating mock workstream with failed thread...\n")
  const mock = createMockWorkstream(repoRoot)

  console.log(`Mock workstream created successfully!`)
  console.log(`  Stream ID: ${MOCK_STREAM_ID}`)
  console.log(`  Stream directory: ${mock.streamDir}`)
  console.log(`  Prompt file: ${mock.promptPath}`)
  console.log(`  Failed thread: ${mock.threadId}`)
  console.log(`  Failed task: ${mock.taskId}`)
  console.log(``)

  console.log(`The mock thread has a failed session that exited with code 1.`)
  console.log(``)

  console.log(`═══════════════════════════════════════════════════════`)
  console.log(`Test Commands:`)
  console.log(`═══════════════════════════════════════════════════════`)
  console.log(``)
  console.log(`1. View the failed thread:`)
  console.log(`   work list --stream ${MOCK_STREAM_ID} --tasks`)
  console.log(``)
  console.log(`2. Try to fix it interactively:`)
  console.log(`   work fix --stream ${MOCK_STREAM_ID}`)
  console.log(``)
  console.log(`3. Retry the thread directly:`)
  console.log(`   work fix --stream ${MOCK_STREAM_ID} --thread ${mock.threadId} --retry`)
  console.log(``)
  console.log(`4. Check task status after retry:`)
  console.log(`   work list --stream ${MOCK_STREAM_ID} --tasks`)
  console.log(``)
  console.log(`5. Clean up when done:`)
  console.log(`   bun run scripts/preview-fix.ts --cleanup`)
  console.log(``)
  console.log(`═══════════════════════════════════════════════════════`)
  console.log(``)

  // Ask if user wants to try the interactive fix now
  console.log(`Would you like to run the interactive fix command now? (y/n)`)
  
  const readline = require("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question("", (answer: string) => {
    rl.close()

    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      console.log(`\nLaunching: work fix --stream ${MOCK_STREAM_ID}\n`)
      
      // Spawn work fix command
      const child = spawn("work", ["fix", "--stream", MOCK_STREAM_ID], {
        stdio: "inherit",
        cwd: repoRoot,
      })

      child.on("close", (code) => {
        console.log(`\nFix command exited with code: ${code}`)
        console.log(`\nRun with --cleanup to remove mock data:`)
        console.log(`  bun run scripts/preview-fix.ts --cleanup`)
        process.exit(code ?? 0)
      })

      child.on("error", (err) => {
        console.error(`Error running fix command: ${err.message}`)
        process.exit(1)
      })
    } else {
      console.log(`\nSkipping interactive mode. You can run the test commands manually.`)
      console.log(`\nRun with --cleanup to remove mock data:`)
      console.log(`  bun run scripts/preview-fix.ts --cleanup`)
      process.exit(0)
    }
  })
}

// Run if called directly
if (import.meta.main) {
  await main()
}
