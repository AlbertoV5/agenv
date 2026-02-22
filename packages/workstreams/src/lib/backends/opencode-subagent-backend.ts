import type {
  AgentExecutionBackend,
  BackendConfig,
  BackendExecutionStart,
  ThreadExecutionRequest,
} from "./types.ts"

const NATIVE_ORCHESTRATION_NOTICE =
  "Native OpenCode orchestration is session-first: run from the planner in an active OpenCode session using Task tool subagents."

export class OpenCodeSubagentBackend implements AgentExecutionBackend {
  readonly name = "opencode-subagent" as const
  private config: BackendConfig | null = null

  async isAvailable(): Promise<boolean> {
    return true
  }

  async initialize(config: BackendConfig): Promise<void> {
    this.config = config
  }

  async executeBatch(
    threads: ThreadExecutionRequest[],
  ): Promise<BackendExecutionStart> {
    if (!this.config) {
      throw new Error("opencode-subagent backend not initialized")
    }

    const results = (async function* () {
      for (const thread of threads) {
        yield {
          threadId: thread.threadId,
          status: "not_supported" as const,
          durationMs: 0,
          error: {
            code: "not_supported" as const,
            message:
              "opencode-subagent backend is de-scoped for CLI subprocess orchestration.",
            details:
              `${NATIVE_ORCHESTRATION_NOTICE} Use legacy fallback --backend tmux for CLI-managed multi-thread execution.`,
          },
        }
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
    this.config = null
  }
}
