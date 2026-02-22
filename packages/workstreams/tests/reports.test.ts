import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generateStageReport, formatStageReportMarkdown } from "../src/lib/reports"
import { updateThreadMetadata } from "../src/lib/threads"
import type { WorkIndex } from "../src/lib/types"

describe("stage reports", () => {
  let tempDir: string
  const streamId = "001-test-stream"

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-reports-test-"))
    await mkdir(join(tempDir, "work", streamId), { recursive: true })

    const index: WorkIndex = {
      version: "1.0.0",
      last_updated: new Date().toISOString(),
      streams: [
        {
          id: streamId,
          name: "test-stream",
          order: 0,
          size: "short",
          session_estimated: {
            length: 1,
            unit: "session",
            session_minutes: [30, 45],
            session_iterations: [4, 8],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          path: `work/${streamId}`,
          generated_by: { workstreams: "0.1.0" },
        },
      ],
    }

    await writeFile(join(tempDir, "work", "index.json"), JSON.stringify(index, null, 2))

    await writeFile(
      join(tempDir, "work", streamId, "PLAN.md"),
      `# Plan: Test

## Summary
Summary

## References

## Stages

### Stage 1: Build

#### Definition
Do work

#### Constitution
- follow rules

#### Questions
- [ ] none

#### Batches

##### Batch 1: Core

###### Thread 1: Parser

**Summary:** Parse data

**Details:** add parser
`,
    )
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("generates thread-native stage report from threads.json", () => {
    updateThreadMetadata(tempDir, streamId, "01.01.01", {
      threadName: "Parser",
      stageName: "Build",
      batchName: "Core",
      status: "completed",
      report: "Parser completed",
      sessions: [],
    })

    const report = generateStageReport(tempDir, streamId, 1)
    expect(report.metrics.totalThreads).toBe(1)
    expect(report.metrics.completed).toBe(1)
    expect(report.batches[0]?.threads[0]?.tasks[0]?.id).toBe("01.01.01")

    const markdown = formatStageReportMarkdown(report)
    expect(markdown).toContain("1/1 threads")
    expect(markdown).toContain("Parser completed")
  })

  test("normalizes planner outcome payload reports during aggregation", () => {
    updateThreadMetadata(tempDir, streamId, "01.01.01", {
      threadName: "Parser",
      stageName: "Build",
      batchName: "Core",
      status: "completed",
      report: JSON.stringify({
        thread_id: "01.01.01",
        status: "completed",
        report: "Normalized planner report",
        artifacts: ["src/parser.ts"],
        next_steps: [],
      }),
      sessions: [],
    })

    const report = generateStageReport(tempDir, streamId, 1)
    const normalized = report.batches[0]?.threads[0]?.tasks[0]?.report
    expect(normalized).toBe("Normalized planner report")
  })
})
