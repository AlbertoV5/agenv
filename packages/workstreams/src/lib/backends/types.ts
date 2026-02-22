import type { NormalizedModelSpec, OpenCodeBackendName, ThreadSessionMap } from "../types.ts"

export const OPENCODE_BACKEND_NAMES: readonly OpenCodeBackendName[] = [
  "tmux",
  "opencode-subagent",
  "opencode-sdk",
] as const

export const ACTIVE_CLI_BACKEND_NAMES: readonly OpenCodeBackendName[] = [
  "tmux",
] as const

export const LEGACY_CLI_BACKEND_NAMES: readonly OpenCodeBackendName[] = [
  "opencode-subagent",
  "opencode-sdk",
] as const

export type ThreadExecutionStatus =
  | "started"
  | "completed"
  | "failed"
  | "aborted"
  | "not_supported"

export type ThreadExecutionErrorCode =
  | "backend_not_available"
  | "not_supported"
  | "not_implemented"
  | "invalid_configuration"
  | "runtime_error"

export interface ThreadExecutionError {
  code: ThreadExecutionErrorCode
  message: string
  details?: string
}

export interface BackendConfig {
  repoRoot: string
  streamId: string
  batchId: string
  sessionName?: string
  port?: number
  synthesisEnabled: boolean
  synthesisModels?: NormalizedModelSpec[]
  maxParallel?: number
}

export interface ThreadExecutionRequest {
  threadId: string
  threadName: string
  stageName: string
  batchName: string
  promptPath: string
  models: NormalizedModelSpec[]
  agentName: string
  sessionId?: string
  firstTaskId?: string
  synthesisAgentName?: string
  synthesisModels?: NormalizedModelSpec[]
}

export interface ThreadExecutionResult {
  threadId: string
  status: ThreadExecutionStatus
  sessionId?: string
  durationMs: number
  synthesisOutput?: string
  error?: ThreadExecutionError
}

export interface BackendExecutionStart {
  backend: OpenCodeBackendName
  mode: "tmux" | "headless"
  threadSessionMap: ThreadSessionMap[]
  results: AsyncIterable<ThreadExecutionResult>
}

export interface AgentExecutionBackend {
  readonly name: OpenCodeBackendName
  isAvailable(): Promise<boolean>
  initialize(config: BackendConfig): Promise<void>
  executeBatch(
    threads: ThreadExecutionRequest[],
  ): Promise<BackendExecutionStart>
  abortAll(): Promise<void>
  dispose(): Promise<void>
}
