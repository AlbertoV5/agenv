import { describe, expect, test } from "bun:test"
import { OpenCodeSubagentBackend } from "../src/lib/backends/opencode-subagent-backend.ts"
import type { ThreadExecutionRequest, ThreadExecutionResult } from "../src/lib/backends/types.ts"

async function collect(
  iterable: AsyncIterable<ThreadExecutionResult>,
): Promise<ThreadExecutionResult[]> {
  const values: ThreadExecutionResult[] = []
  for await (const value of iterable) {
    values.push(value)
  }
  return values
}

function makeThread(overrides: Partial<ThreadExecutionRequest> = {}): ThreadExecutionRequest {
  return {
    threadId: "01.01.01",
    threadName: "Thread One",
    stageName: "Stage One",
    batchName: "Batch One",
    promptPath: "/tmp/thread-1.md",
    models: [{ model: "opencode/glm-5-free" }],
    agentName: "default",
    ...overrides,
  }
}

describe("opencode subagent backend", () => {
  test("returns explicit not_supported results for every thread", async () => {
    const backend = new OpenCodeSubagentBackend()
    await backend.initialize({
      repoRoot: "/repo",
      streamId: "001-test",
      batchId: "01.01",
      synthesisEnabled: false,
    })

    const start = await backend.executeBatch([
      makeThread({ threadId: "01.01.01" }),
      makeThread({ threadId: "01.01.02" }),
    ])

    const results = await collect(start.results)

    expect(start.mode).toBe("headless")
    expect(results).toHaveLength(2)
    expect(results.every((result) => result.status === "not_supported")).toBe(true)
    expect(results[0]?.error?.details).toContain("session-first")
    expect(results[0]?.error?.details).toContain("--backend tmux")
  })

  test("throws when executeBatch called before initialize", async () => {
    const backend = new OpenCodeSubagentBackend()
    await expect(backend.executeBatch([makeThread()])).rejects.toThrow(
      "opencode-subagent backend not initialized",
    )
  })
})
