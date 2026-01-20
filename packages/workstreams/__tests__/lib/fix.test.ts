import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { appendFixStage, appendFixBatch } from "../../src/lib/fix"

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
    const planContent = `
# Plan: Test Stream
## Summary
Summary text.
## Stages
### Stage 1: Initial
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const result = appendFixStage(tempDir, streamId, {
      targetStage: 1,
      name: "bug-fixes",
      description: "Fixing bugs",
    })

    expect(result.success).toBe(true)
    expect(result.newStageNumber).toBe(2)

    const newContent = await readFile(join(tempDir, "work", streamId, "PLAN.md"), "utf-8")
    expect(newContent).toContain("### Stage 2: Fix - bug-fixes")
    expect(newContent).toContain("Addressing issues found in Stage 1")
    expect(newContent).toContain("Fixing bugs")
    expect(newContent).toContain("Batch 01: Fixes")
  })

  test("appends fix batch to existing stage in PLAN.md", async () => {
    const planContent = `# Plan: Test Stream
## Summary
Summary text.

## Stages

### Stage 1: Initial

#### Batches

##### Batch 00: Setup

###### Thread 1: Init

### Stage 2: Next
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const result = appendFixBatch(tempDir, streamId, {
      targetStage: 1,
      name: "validation-fix",
      description: "Fixing validation logic",
    })

    expect(result.success).toBe(true)
    expect(result.newBatchNumber).toBe(1) // 00 -> 01

    const newContent = await readFile(join(tempDir, "work", streamId, "PLAN.md"), "utf-8")
    
    // Should contain new batch
    expect(newContent).toContain("##### Batch 01: Fix - validation-fix")
    
    // Should be BEFORE Stage 2
    const batchIndex = newContent.indexOf("Batch 01: Fix - validation-fix")
    const stage2Index = newContent.indexOf("### Stage 2: Next")
    
    expect(batchIndex).toBeGreaterThan(-1)
    expect(stage2Index).toBeGreaterThan(-1)
    expect(batchIndex).toBeLessThan(stage2Index)
  })
})
