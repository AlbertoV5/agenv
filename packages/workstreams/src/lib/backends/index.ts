import type { AgentsConfigYaml, OpenCodeBackendName } from "../types.ts"
import {
  ACTIVE_CLI_BACKEND_NAMES,
  LEGACY_CLI_BACKEND_NAMES,
  OPENCODE_BACKEND_NAMES,
  type AgentExecutionBackend,
} from "./types.ts"
import { OpenCodeTmuxBackend } from "./opencode-tmux-backend.ts"
import { OpenCodeSubagentBackend } from "./opencode-subagent-backend.ts"
import { OpenCodeSdkBackend } from "./opencode-sdk-backend.ts"

const DE_SCOPED_CLI_BACKENDS: ReadonlySet<OpenCodeBackendName> = new Set(
  LEGACY_CLI_BACKEND_NAMES,
)

interface ResolveBackendOptions {
  allowLegacyCliBackends?: boolean
}

export function getCliSelectableBackends(
  allowLegacyCliBackends: boolean = false,
): readonly OpenCodeBackendName[] {
  if (allowLegacyCliBackends) {
    return OPENCODE_BACKEND_NAMES
  }
  return ACTIVE_CLI_BACKEND_NAMES
}

export function isOpenCodeBackendName(value: string): value is OpenCodeBackendName {
  return OPENCODE_BACKEND_NAMES.includes(value as OpenCodeBackendName)
}

export function resolveBackendSelection(
  cliBackend: string | undefined,
  agentsConfig: AgentsConfigYaml | null,
  options: ResolveBackendOptions = {},
): OpenCodeBackendName {
  const allowLegacyCliBackends = options.allowLegacyCliBackends ?? false

  if (cliBackend) {
    if (!isOpenCodeBackendName(cliBackend)) {
      throw new Error(
        `Invalid backend "${cliBackend}". Allowed values: ${OPENCODE_BACKEND_NAMES.join(", ")}`,
      )
    }

    if (!allowLegacyCliBackends && DE_SCOPED_CLI_BACKENDS.has(cliBackend)) {
      throw new Error(
        `Backend "${cliBackend}" is legacy/de-scoped for CLI orchestration. Use --allow-legacy-backends to opt in, or use native in-session planner orchestration (Task tool subagents).`,
      )
    }

    return cliBackend
  }

  const configuredBackend = agentsConfig?.execution?.backend
  if (configuredBackend) {
    if (DE_SCOPED_CLI_BACKENDS.has(configuredBackend)) {
      return "tmux"
    }
    return configuredBackend
  }

  return "tmux"
}

export function createExecutionBackend(
  backendName: OpenCodeBackendName,
): AgentExecutionBackend {
  switch (backendName) {
    case "tmux":
      return new OpenCodeTmuxBackend()
    case "opencode-subagent":
      return new OpenCodeSubagentBackend()
    case "opencode-sdk":
      return new OpenCodeSdkBackend()
    default: {
      const neverBackend: never = backendName
      throw new Error(`Unsupported backend: ${String(neverBackend)}`)
    }
  }
}

export type {
  AgentExecutionBackend,
  BackendConfig,
  BackendExecutionStart,
  ThreadExecutionError,
  ThreadExecutionErrorCode,
  ThreadExecutionRequest,
  ThreadExecutionResult,
  ThreadExecutionStatus,
} from "./types.ts"

export { OPENCODE_BACKEND_NAMES } from "./types.ts"
export {
  ACTIVE_CLI_BACKEND_NAMES,
  LEGACY_CLI_BACKEND_NAMES,
} from "./types.ts"
