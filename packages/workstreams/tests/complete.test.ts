import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generateCompletionMd } from "../src/lib/complete"
import { updateThreadMetadata } from "../src/lib/threads"
import type { WorkIndex } from "../src/lib/types"

describe("completion metrics", () => {
  let tempDir: string
  const streamId = "001-test-stream"

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-complete-test-"))
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
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("writes thread-first METRICS.md", async () => {
    updateThreadMetadata(tempDir, streamId, "01.01.01", {
      threadName: "Core",
      stageName: "Build",
      batchName: "Batch 01",
      status: "completed",
      assignedAgent: "agent-a",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:10:00.000Z",
      sessions: [],
    })
    updateThreadMetadata(tempDir, streamId, "01.01.02", {
      threadName: "Tests",
      stageName: "Build",
      batchName: "Batch 01",
      status: "completed",
      assignedAgent: "agent-b",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:20:00.000Z",
      sessions: [],
    })

    const metricsPath = generateCompletionMd({ repoRoot: tempDir, streamId })
    const content = await readFile(metricsPath, "utf-8")

    expect(content).toContain("| Threads | 2/2 |")
    expect(content).toContain("Fastest Thread")
    expect(content).toContain("Slowest Thread")
    expect(content).toContain("## Agent Performance")
  })
})
