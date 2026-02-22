import type {
  AgentExecutionBackend,
  BackendConfig,
  BackendExecutionStart,
  ThreadExecutionRequest,
} from "./types.ts"
import {
  setupTmuxSession,
  setupGridController,
  setupKillSessionKeybind,
} from "../multi-orchestrator.ts"
import { sessionExists } from "../tmux.ts"

interface TmuxBackendDeps {
  setupTmuxSession: typeof setupTmuxSession
  setupGridController: typeof setupGridController
  setupKillSessionKeybind: typeof setupKillSessionKeybind
  sessionExists: typeof sessionExists
}

const defaultDeps: TmuxBackendDeps = {
  setupTmuxSession,
  setupGridController,
  setupKillSessionKeybind,
  sessionExists,
}

export class OpenCodeTmuxBackend implements AgentExecutionBackend {
  readonly name = "tmux" as const
  private config: BackendConfig | null = null

  constructor(private readonly deps: TmuxBackendDeps = defaultDeps) {}

  async isAvailable(): Promise<boolean> {
    const result = Bun.spawnSync(["tmux", "-V"], { stdout: "ignore", stderr: "ignore" })
    return result.exitCode === 0
  }

  async initialize(config: BackendConfig): Promise<void> {
    this.config = config
  }

  async executeBatch(
    threads: ThreadExecutionRequest[],
  ): Promise<BackendExecutionStart> {
    if (!this.config) {
      throw new Error("tmux backend not initialized")
    }

    if (!this.config.sessionName) {
      throw new Error("tmux backend requires sessionName")
    }

    if (!this.config.port) {
      throw new Error("tmux backend requires port")
    }

    if (this.deps.sessionExists(this.config.sessionName)) {
      throw new Error(`tmux session "${this.config.sessionName}" already exists`)
    }

    const { threadSessionMap } = this.deps.setupTmuxSession(
      this.config.sessionName,
      threads,
      this.config.port,
      this.config.repoRoot,
      this.config.streamId,
      this.config.batchId,
    )

    await this.deps.setupGridController(
      this.config.sessionName,
      threads,
      this.config.port,
      this.config.batchId,
      this.config.repoRoot,
      this.config.streamId,
    )

    this.deps.setupKillSessionKeybind()

    const startedAt = Date.now()
    const iterable = (async function* () {
      for (const thread of threads) {
        yield {
          threadId: thread.threadId,
          status: "started" as const,
          durationMs: Date.now() - startedAt,
          sessionId: thread.sessionId,
        }
      }
    })()

    return {
      backend: this.name,
      mode: "tmux",
      threadSessionMap,
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
