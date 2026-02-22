import { describe, expect, test, beforeEach, afterEach, spyOn, mock } from "bun:test"
import { main } from "../src/cli/list"
import * as repo from "../src/lib/repo.ts"
import * as index from "../src/lib/index.ts"
import * as threads from "../src/lib/threads.ts"
import type { ThreadMetadata, WorkIndex, StreamMetadata } from "../src/lib/types"

describe("CLI: list", () => {
  let logSpy: any
  let errSpy: any

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {})
    errSpy = spyOn(console, "error").mockImplementation(() => {})
    spyOn(repo, "getRepoRoot").mockReturnValue("/tmp/repo")

    const stream: StreamMetadata = {
      id: "001-test",
      name: "test",
      status: "in_progress",
      session_estimated: { length: 1, unit: "session", session_minutes: [30, 45], session_iterations: [4, 8] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      path: "work/001-test",
      generated_by: { workstreams: "0.1.0" },
      size: "short",
      order: 1,
    }

    spyOn(index, "loadIndex").mockReturnValue({
      version: "1.0.0",
      last_updated: new Date().toISOString(),
      streams: [stream],
    } as WorkIndex)
    spyOn(index, "getResolvedStream").mockReturnValue(stream)
  })

  afterEach(() => {
    mock.restore()
  })

  test("outputs threads in json", () => {
    const data: ThreadMetadata[] = [{
      threadId: "01.01.01",
      threadName: "one",
      stageName: "Stage 1",
      batchName: "Batch 1",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
    }]
    spyOn(threads, "getThreads").mockReturnValue(data)

    main(["node", "work-list", "--json"])
    const payload = JSON.parse(logSpy.mock.calls[0][0])
    expect(payload[0].threadId).toBe("01.01.01")
  })

  test("supports deprecated --tasks alias", () => {
    spyOn(threads, "getThreads").mockReturnValue([])
    main(["node", "work-list", "--tasks"])
    expect(errSpy.mock.calls.map((c: any[]) => c[0]).join("\n")).toContain("Deprecation")
  })
})
