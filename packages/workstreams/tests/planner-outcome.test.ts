import { describe, expect, test } from "bun:test"
import {
  getPlannerOutcomeTemplate,
  parsePlannerOutcomePayload,
  validatePlannerOutcomePayload,
} from "../src/lib/planner-outcome"

describe("planner outcome contract", () => {
  test("generates deterministic template", () => {
    const payload = getPlannerOutcomeTemplate("01.01.01")
    expect(payload.thread_id).toBe("01.01.01")
    expect(payload.status).toBe("completed")
    expect(payload.artifacts).toEqual(["path/to/file"])
    expect(payload.next_steps).toEqual(["optional follow-up"])
  })

  test("validates conforming payload", () => {
    const result = validatePlannerOutcomePayload(
      {
        thread_id: "01.01.01",
        status: "completed",
        report: "Done",
        artifacts: ["src/a.ts"],
        next_steps: [],
      },
      "01.01.01",
    )

    expect(result.valid).toBe(true)
    expect(result.payload?.thread_id).toBe("01.01.01")
  })

  test("rejects thread mismatch", () => {
    const result = validatePlannerOutcomePayload(
      {
        thread_id: "01.01.02",
        status: "completed",
        report: "Done",
        artifacts: [],
        next_steps: [],
      },
      "01.01.01",
    )

    expect(result.valid).toBe(false)
    expect(result.errors.join(" ")).toContain("thread_id mismatch")
  })

  test("parses fenced json payload", () => {
    const result = parsePlannerOutcomePayload(
      "```json\n{\"thread_id\":\"01.01.01\",\"status\":\"blocked\",\"report\":\"Waiting\",\"artifacts\":[],\"next_steps\":[\"unblock dep\"]}\n```",
      "01.01.01",
    )

    expect(result.valid).toBe(true)
    expect(result.payload?.status).toBe("blocked")
  })
})
