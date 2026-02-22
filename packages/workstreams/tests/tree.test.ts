import { describe, expect, test, beforeEach, afterEach, spyOn, mock } from "bun:test"
import { main } from "../src/cli/tree.ts"
import * as repo from "../src/lib/repo.ts"
import * as index from "../src/lib/index.ts"
import * as threads from "../src/lib/threads.ts"
import type { ThreadMetadata, WorkIndex, StreamMetadata } from "../src/lib/types.ts"

describe("work tree", () => {
  let consoleSpy: any
  let exitSpy: any
  let getThreadsSpy: any

  beforeEach(() => {
    consoleSpy = spyOn(console, "log").mockImplementation(() => {})
    exitSpy = spyOn(process, "exit").mockImplementation((() => {}) as never)
    spyOn(repo, "getRepoRoot").mockReturnValue("/tmp/test-repo")

    const mockStream: StreamMetadata = {
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
      streams: [mockStream],
    } as WorkIndex)

    spyOn(index, "getResolvedStream").mockReturnValue(mockStream)
  })

  afterEach(() => {
    mock.restore()
  })

  test("displays tree structure correctly", () => {
    const mockThreads: ThreadMetadata[] = [
      {
        threadId: "01.01.01",
        threadName: "Init",
        stageName: "Planning",
        batchName: "Setup",
        status: "in_progress",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [],
      },
    ]

    getThreadsSpy = spyOn(threads, "getThreads").mockReturnValue(mockThreads)

    main(["node", "work-tree", "--stream", "001-test"])
    const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join("\n")

    expect(output).toContain("Workstream: 001-test")
    expect(output).toContain("Stage 01: Planning")
    expect(output).toContain("Batch 01: Setup")
    expect(output).toContain("Thread 01: Init")
  })

  test("handles empty workstream", () => {
    getThreadsSpy = spyOn(threads, "getThreads").mockReturnValue([])
    main(["node", "work-tree", "--stream", "001-test"])
    expect(consoleSpy).toHaveBeenCalledWith("Workstream: 001-test (Empty)")
  })
})
