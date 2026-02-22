import { describe, expect, test } from "bun:test"
import type { AgentsConfigYaml, ThreadInfo } from "../src/lib/types.ts"
import {
  createExecutionBackend,
  resolveBackendSelection,
} from "../src/lib/backends/index.ts"
import { executeThreadBatchWithBackend } from "../src/lib/multi-orchestrator.ts"
import type {
  AgentExecutionBackend,
  BackendConfig,
  BackendExecutionStart,
  ThreadExecutionRequest,
  ThreadExecutionResult,
} from "../src/lib/backends/index.ts"
import { OpenCodeTmuxBackend } from "../src/lib/backends/opencode-tmux-backend.ts"
import { parseAgentsYaml } from "../src/lib/agents-yaml.ts"

async function collectResults(
  results: AsyncIterable<ThreadExecutionResult>,
): Promise<ThreadExecutionResult[]> {
  const collected: ThreadExecutionResult[] = []
  for await (const result of results) {
    collected.push(result)
  }
  return collected
}

describe("backend selection", () => {
  test("uses CLI backend over config backend", () => {
    const config: AgentsConfigYaml = {
      agents: [],
      execution: { backend: "opencode-sdk" },
    }
    expect(resolveBackendSelection("tmux", config)).toBe("tmux")
  })

  test("falls back to tmux when configured backend is legacy", () => {
    const config: AgentsConfigYaml = {
      agents: [],
      execution: { backend: "opencode-subagent" },
    }
    expect(resolveBackendSelection(undefined, config)).toBe("tmux")
  })

  test("rejects legacy backend from CLI without explicit opt-in", () => {
    expect(() =>
      resolveBackendSelection("opencode-sdk", { agents: [] }),
    ).toThrow("legacy/de-scoped")
  })

  test("accepts legacy backend from CLI with explicit opt-in", () => {
    expect(
      resolveBackendSelection("opencode-sdk", { agents: [] }, { allowLegacyCliBackends: true }),
    ).toBe("opencode-sdk")
  })

  test("defaults to tmux when no backend configured", () => {
    expect(resolveBackendSelection(undefined, { agents: [] })).toBe("tmux")
  })

  test("rejects invalid CLI backend", () => {
    expect(() => resolveBackendSelection("claude", { agents: [] })).toThrow(
      "Invalid backend",
    )
  })

  test("parses execution config from agents.yaml", () => {
    const yaml = `agents: []\nexecution:\n  backend: opencode-sdk\n  port: 4141\n  max_parallel: 3\n`
    const { config, errors } = parseAgentsYaml(yaml)
    expect(errors).toHaveLength(0)
    expect(config?.execution?.backend).toBe("opencode-sdk")
    expect(config?.execution?.port).toBe(4141)
    expect(config?.execution?.max_parallel).toBe(3)
  })
})

describe("orchestrator backend routing", () => {
  test("routes execution through backend abstraction", async () => {
    const calls: { initialized?: BackendConfig; executed?: ThreadExecutionRequest[] } = {}

    class FakeBackend implements AgentExecutionBackend {
      readonly name = "opencode-sdk" as const
      async isAvailable(): Promise<boolean> {
        return true
      }
      async initialize(config: BackendConfig): Promise<void> {
        calls.initialized = config
      }
      async executeBatch(
        threads: ThreadExecutionRequest[],
      ): Promise<BackendExecutionStart> {
        calls.executed = threads
        const results = (async function* () {
          yield {
            threadId: threads[0]!.threadId,
            status: "completed" as const,
            durationMs: 1,
          }
        })()
        return {
          backend: this.name,
          mode: "headless",
          threadSessionMap: [],
          results,
        }
      }
      async abortAll(): Promise<void> {
        return
      }
      async dispose(): Promise<void> {
        return
      }
    }

    const thread: ThreadInfo = {
      threadId: "01.01.01",
      threadName: "Thread",
      stageName: "Stage",
      batchName: "Batch",
      promptPath: "/tmp/thread.md",
      models: [{ model: "anthropic/claude-sonnet-4" }],
      agentName: "default",
      sessionId: "s-1",
      firstTaskId: "01.01.01.01",
    }

    const backend = new FakeBackend()
    const start = await executeThreadBatchWithBackend(
      backend,
      {
        repoRoot: "/repo",
        streamId: "001-test",
        batchId: "01.01",
        synthesisEnabled: false,
      },
      [thread],
    )

    const results = await collectResults(start.results)
    expect(calls.initialized?.streamId).toBe("001-test")
    expect(calls.executed?.[0]?.threadId).toBe("01.01.01")
    expect(results[0]?.status).toBe("completed")
  })
})

describe("tmux backend abstraction", () => {
  test("openCode tmux backend wraps existing tmux setup path", async () => {
    const calls = {
      setupTmuxSession: 0,
      setupGridController: 0,
      setupKillSessionKeybind: 0,
    }

    const backend = new OpenCodeTmuxBackend({
      setupTmuxSession: (_sessionName, _threads) => {
        calls.setupTmuxSession += 1
        return {
          sessionName: "work-001-test",
          threadSessionMap: [
            {
              threadId: "01.01.01",
              sessionId: "internal-1",
              taskId: "01.01.01.01",
              paneId: "%1",
              windowIndex: 0,
            },
          ],
        }
      },
      setupGridController: async () => {
        calls.setupGridController += 1
      },
      setupKillSessionKeybind: () => {
        calls.setupKillSessionKeybind += 1
      },
      sessionExists: () => false,
    })

    await backend.initialize({
      repoRoot: "/repo",
      streamId: "001-test",
      batchId: "01.01",
      sessionName: "work-001-test",
      port: 4096,
      synthesisEnabled: false,
    })

    const start = await backend.executeBatch([
      {
        threadId: "01.01.01",
        threadName: "Thread",
        stageName: "Stage",
        batchName: "Batch",
        promptPath: "/tmp/thread.md",
        models: [{ model: "anthropic/claude-sonnet-4" }],
        agentName: "default",
        sessionId: "internal-1",
        firstTaskId: "01.01.01.01",
      },
    ])

    const results = await collectResults(start.results)

    expect(calls.setupTmuxSession).toBe(1)
    expect(calls.setupGridController).toBe(1)
    expect(calls.setupKillSessionKeybind).toBe(1)
    expect(start.mode).toBe("tmux")
    expect(start.threadSessionMap).toHaveLength(1)
    expect(results[0]?.status).toBe("started")
  })

  test("factory returns tmux backend for default route", () => {
    const backend = createExecutionBackend("tmux")
    expect(backend.name).toBe("tmux")
  })
})
