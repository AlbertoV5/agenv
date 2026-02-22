import type {
  AgentExecutionBackend,
  BackendConfig,
  BackendExecutionStart,
  ThreadExecutionRequest,
} from "./types.ts"

export class OpenCodeSdkBackend implements AgentExecutionBackend {
  readonly name = "opencode-sdk" as const
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
    const iterable = (async function* () {
      for (const thread of threads) {
        yield {
          threadId: thread.threadId,
          status: "not_supported" as const,
          durationMs: 0,
          error: {
            code: "not_implemented" as const,
            message:
              "OpenCode SDK backend is de-scoped in this cleanup pass.",
            details:
              "Use native in-session planner orchestration with Task tool subagents, or use --backend tmux for CLI fallback.",
          },
        }
      }
    })()

    return {
      backend: this.name,
      mode: "headless",
      threadSessionMap: [],
      results: iterable,
    }
  }

  async abortAll(): Promise<void> {
    return
  }

  async dispose(): Promise<void> {
    this.config = null
  }
}
