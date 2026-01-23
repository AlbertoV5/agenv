import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execSync } from "child_process"
import { appendFixStage, appendFixBatch } from "../src/lib/fix"
import {
  sessionExists,
  killSession,
  createSession,
  setGlobalOption,
  attachSession,
} from "../src/lib/tmux"

describe("fix", () => {
  let tempDir: string
  const streamId = "001-test-stream"

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-fix-test-"))
    await mkdir(join(tempDir, "work", streamId), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("appends fix stage to PLAN.md", async () => {
    const planContent = `# Plan: Test Stream
## Summary
Summary text.

## Stages

### Stage 01: Initial

#### Definition

A stage.

#### Constitution

**Inputs:**

- 

**Structure:**

- 

**Outputs:**

- 

#### Stage Questions

- [ ]

#### Batches

##### Batch 01: Setup

###### Thread 01: Init

**Summary:**

Summary

**Details:**
- [ ] Setup
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const result = appendFixStage(tempDir, streamId, {
      targetStage: 1,
      name: "bug-fixes",
      description: "Fixing bugs",
    })


    expect(result.success).toBe(true)
    expect(result.newStageNumber).toBe(2)

    const newContent = await readFile(
      join(tempDir, "work", streamId, "PLAN.md"),
      "utf-8",
    )
    expect(newContent).toContain("### Stage 02: Fix - bug-fixes")
    expect(newContent).toContain("Addressing issues found in Stage 01")
    expect(newContent).toContain("Fixing bugs")
    expect(newContent).toContain("Batch 01: Fixes")
  })

  test("appends fix batch to existing stage in PLAN.md", async () => {
    const planContent = `# Plan: Test Stream
## Summary
Summary text.

## Stages

### Stage 01: Initial

#### Batches

##### Batch 01: Setup

###### Thread 01: Init

### Stage 2: Next
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const result = appendFixBatch(tempDir, streamId, {
      targetStage: 1,
      name: "validation-fix",
      description: "Fixing validation logic",
    })

    expect(result.success).toBe(true)
    expect(result.newBatchNumber).toBe(2) // 01 -> 02

    const newContent = await readFile(
      join(tempDir, "work", streamId, "PLAN.md"),
      "utf-8",
    )

    // Should contain new batch
    expect(newContent).toContain("##### Batch 02: Fix - validation-fix")

    // Should be BEFORE Stage 2
    const batchIndex = newContent.indexOf("Batch 02: Fix - validation-fix")
    const stage2Index = newContent.indexOf("### Stage 2: Next")

    expect(batchIndex).toBeGreaterThan(-1)
    expect(stage2Index).toBeGreaterThan(-1)
    expect(batchIndex).toBeLessThan(stage2Index)
  })

  test("appends fix batch to last stage (no next stage)", async () => {
    const planContent = `# Plan: Test Stream
## Summary
Summary text.

## Stages

### Stage 01: Only Stage

#### Batches

##### Batch 01: Setup

###### Thread 01: Init
**Summary:**
Initialize the project.

**Details:**
- [ ] Setup
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const result = appendFixBatch(tempDir, streamId, {
      targetStage: 1,
      name: "final-fixes",
      description: "Final fixes for stage 1",
    })

    expect(result.success).toBe(true)
    expect(result.newBatchNumber).toBe(2) // 01 -> 02

    const newContent = await readFile(
      join(tempDir, "work", streamId, "PLAN.md"),
      "utf-8",
    )

    // Should contain new batch
    expect(newContent).toContain("##### Batch 02: Fix - final-fixes")
    expect(newContent).toContain("Final fixes for stage 1")

    // Should be after Batch 01 content
    const batch00Index = newContent.indexOf("##### Batch 01: Setup")
    const batch01Index = newContent.indexOf("##### Batch 02: Fix - final-fixes")

    expect(batch00Index).toBeGreaterThan(-1)
    expect(batch01Index).toBeGreaterThan(-1)
    expect(batch01Index).toBeGreaterThan(batch00Index)
  })

  test("appends fix batch to stage with no existing batches", async () => {
    const planContent = `# Plan: Test Stream
## Summary
Summary text.

## Stages

### Stage 01: Empty Stage

#### Definition
A stage with no batches yet.

### Stage 2: Next Stage
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const result = appendFixBatch(tempDir, streamId, {
      targetStage: 1,
      name: "initial-batch",
      description: "First batch for this stage",
    })

    expect(result.success).toBe(true)
    expect(result.newBatchNumber).toBe(0) // No batches -> 00

    const newContent = await readFile(
      join(tempDir, "work", streamId, "PLAN.md"),
      "utf-8",
    )

    // Should contain new batch with 00 prefix
    expect(newContent).toContain("##### Batch 00: Fix - initial-batch")

    // Should be BEFORE Stage 2
    const batchIndex = newContent.indexOf("##### Batch 00: Fix - initial-batch")
    const stage2Index = newContent.indexOf("### Stage 2: Next")

    expect(batchIndex).toBeGreaterThan(-1)
    expect(stage2Index).toBeGreaterThan(-1)
    expect(batchIndex).toBeLessThan(stage2Index)
  })
})

describe("fix tmux integration", () => {
  const testSessions: string[] = []

  const getTestFixSessionName = (threadId: string) => {
    // Match the format used in fix.ts: work-fix-{threadId} with dots replaced by dashes
    const safeThreadId = threadId.replace(/\./g, "-")
    const name = `work-fix-${safeThreadId}-test-${Math.random().toString(36).substring(7)}`
    testSessions.push(name)
    return name
  }

  afterEach(() => {
    testSessions.forEach((name) => {
      try {
        execSync(`tmux kill-session -t "${name}" 2>/dev/null`)
      } catch {}
    })
    testSessions.length = 0
  })

  test("fix session name format converts dots to dashes", () => {
    // Test the session naming convention used by fix command
    const threadId = "01.02.03"
    const safeThreadId = threadId.replace(/\./g, "-")
    expect(safeThreadId).toBe("01-02-03")
    // Session name should be work-fix-01-02-03
    const sessionName = `work-fix-${safeThreadId}`
    expect(sessionName).toBe("work-fix-01-02-03")
  })

  test("can create fix session with remain-on-exit option", () => {
    const sessionName = getTestFixSessionName("01.01.01")
    const threadName = "Test Thread"
    const command = "echo 'test fix session'"

    // Create session (mimicking fix.ts behavior)
    createSession(sessionName, threadName, command)
    setGlobalOption(sessionName, "remain-on-exit", "on")

    expect(sessionExists(sessionName)).toBe(true)

    // Verify remain-on-exit is set
    const output = execSync(
      `tmux show-options -t "${sessionName}" -v remain-on-exit`,
      { encoding: "utf-8" }
    )
    expect(output.trim()).toBe("on")
  })

  test("fix session detects existing session", () => {
    const sessionName = getTestFixSessionName("01.01.02")

    // Create a session first
    createSession(sessionName, "Existing", "sleep 10")
    expect(sessionExists(sessionName)).toBe(true)

    // Verify sessionExists returns true (fix.ts would show error for existing session)
    const exists = sessionExists(sessionName)
    expect(exists).toBe(true)
  })

  test("fix session can be killed and recreated", () => {
    const sessionName = getTestFixSessionName("01.01.03")

    // Create session
    createSession(sessionName, "First", "sleep 10")
    expect(sessionExists(sessionName)).toBe(true)

    // Kill it
    killSession(sessionName)
    expect(sessionExists(sessionName)).toBe(false)

    // Recreate with different command
    createSession(sessionName, "Second", "sleep 20")
    expect(sessionExists(sessionName)).toBe(true)
  })

  test("sessionExists returns false for non-existent fix session", () => {
    const nonExistentSession = "work-fix-99-99-99-nonexistent"
    expect(sessionExists(nonExistentSession)).toBe(false)
  })

  test("multiple fix sessions can coexist", () => {
    const session1 = getTestFixSessionName("01.01.01")
    const session2 = getTestFixSessionName("01.01.02")
    const session3 = getTestFixSessionName("01.02.01")

    createSession(session1, "Thread 1", "sleep 10")
    createSession(session2, "Thread 2", "sleep 10")
    createSession(session3, "Thread 3", "sleep 10")

    expect(sessionExists(session1)).toBe(true)
    expect(sessionExists(session2)).toBe(true)
    expect(sessionExists(session3)).toBe(true)
  })

  test("fix session window name matches thread name", () => {
    const sessionName = getTestFixSessionName("01.01.04")
    const threadName = "My Test Thread"

    createSession(sessionName, threadName, "sleep 10")

    // List windows and verify the window name
    const output = execSync(
      `tmux list-windows -t "${sessionName}" -F "#{window_name}"`,
      { encoding: "utf-8" }
    )
    expect(output.trim()).toBe(threadName)
  })
})
