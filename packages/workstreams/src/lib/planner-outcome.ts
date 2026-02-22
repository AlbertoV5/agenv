export const PLANNER_OUTCOME_REQUIRED_FIELDS = [
  "thread_id",
  "status",
  "report",
  "artifacts",
  "next_steps",
] as const

export const PLANNER_OUTCOME_STATUS_VALUES = ["completed", "blocked"] as const

export type PlannerOutcomeStatus = (typeof PLANNER_OUTCOME_STATUS_VALUES)[number]

export interface PlannerOutcomePayload {
  thread_id: string
  status: PlannerOutcomeStatus
  report: string
  artifacts: string[]
  next_steps: string[]
}

export interface PlannerOutcomeValidationResult {
  valid: boolean
  errors: string[]
  payload: PlannerOutcomePayload | null
}

export function getPlannerOutcomeTemplate(
  threadId: string,
): PlannerOutcomePayload {
  return {
    thread_id: threadId,
    status: "completed",
    report: "1-2 sentence thread outcome summary",
    artifacts: ["path/to/file"],
    next_steps: ["optional follow-up"],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("```")) {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1])
    }
  }

  return JSON.parse(trimmed)
}

export function validatePlannerOutcomePayload(
  payload: unknown,
  expectedThreadId?: string,
): PlannerOutcomeValidationResult {
  const errors: string[] = []

  if (!isRecord(payload)) {
    return {
      valid: false,
      errors: ["payload must be a JSON object"],
      payload: null,
    }
  }

  const threadId = payload.thread_id
  const status = payload.status
  const report = payload.report
  const artifacts = payload.artifacts
  const nextSteps = payload.next_steps

  if (typeof threadId !== "string" || !threadId.trim()) {
    errors.push("thread_id must be a non-empty string")
  }

  if (expectedThreadId && threadId !== expectedThreadId) {
    errors.push(`thread_id mismatch: expected ${expectedThreadId}, got ${String(threadId)}`)
  }

  if (
    typeof status !== "string" ||
    !PLANNER_OUTCOME_STATUS_VALUES.includes(status as PlannerOutcomeStatus)
  ) {
    errors.push(
      `status must be one of: ${PLANNER_OUTCOME_STATUS_VALUES.join(", ")}`,
    )
  }

  if (typeof report !== "string" || !report.trim()) {
    errors.push("report must be a non-empty string")
  }

  if (!Array.isArray(artifacts) || artifacts.some((item) => typeof item !== "string")) {
    errors.push("artifacts must be an array of strings")
  }

  if (!Array.isArray(nextSteps) || nextSteps.some((item) => typeof item !== "string")) {
    errors.push("next_steps must be an array of strings")
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      payload: null,
    }
  }

  return {
    valid: true,
    errors: [],
    payload: {
      thread_id: threadId as string,
      status: status as PlannerOutcomeStatus,
      report: report as string,
      artifacts: artifacts as string[],
      next_steps: nextSteps as string[],
    },
  }
}

export function parsePlannerOutcomePayload(
  text: string,
  expectedThreadId?: string,
): PlannerOutcomeValidationResult {
  try {
    const parsed = parseJsonObject(text)
    return validatePlannerOutcomePayload(parsed, expectedThreadId)
  } catch {
    return {
      valid: false,
      errors: ["payload is not valid JSON"],
      payload: null,
    }
  }
}
