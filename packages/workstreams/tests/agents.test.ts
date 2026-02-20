import { describe, test, expect } from "bun:test"
import { isValidModelFormat } from "../src/lib/model"

describe("isValidModelFormat", () => {
  test("returns true for valid provider/model format", () => {
    expect(isValidModelFormat("anthropic/claude-opus")).toBe(true)
    expect(isValidModelFormat("anthropic/claude-sonnet-4")).toBe(true)
    expect(isValidModelFormat("google/gemini-3-flash-preview")).toBe(true)
    expect(isValidModelFormat("openai/gpt-4")).toBe(true)
  })

  test("returns false for invalid format (no slash)", () => {
    expect(isValidModelFormat("claude-opus")).toBe(false)
    expect(isValidModelFormat("gpt-4")).toBe(false)
    expect(isValidModelFormat("model")).toBe(false)
  })
})
