import { describe, test, expect } from "bun:test"
import { isValidModelFormat } from "../src/lib/agents"

/**
 * Tests for agents.ts
 *
 * Note: AGENTS.md support has been deprecated. The parsing, generation,
 * and file operation tests have been removed. For agent configuration,
 * see agents-yaml.test.ts.
 *
 * Only isValidModelFormat is kept as it's a shared utility function.
 */

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

describe("deprecated functions", () => {
  test("getAgentsConfig returns null with deprecation warning", () => {
    const { getAgentsConfig } = require("../src/lib/agents")
    const originalWarn = console.warn
    let warningMessage = ""
    console.warn = (msg: string) => {
      warningMessage = msg
    }

    const result = getAgentsConfig("/some/path")

    expect(result).toBeNull()
    expect(warningMessage).toContain("DEPRECATED")
    console.warn = originalWarn
  })

  test("listAgents returns empty array with deprecation warning", () => {
    const { listAgents } = require("../src/lib/agents")
    const originalWarn = console.warn
    let warningMessage = ""
    console.warn = (msg: string) => {
      warningMessage = msg
    }

    const result = listAgents({ agents: [] })

    expect(result).toEqual([])
    expect(warningMessage).toContain("DEPRECATED")
    console.warn = originalWarn
  })

  test("getAgent returns null with deprecation warning", () => {
    const { getAgent } = require("../src/lib/agents")
    const originalWarn = console.warn
    let warningMessage = ""
    console.warn = (msg: string) => {
      warningMessage = msg
    }

    const result = getAgent({ agents: [] }, "some-agent")

    expect(result).toBeNull()
    expect(warningMessage).toContain("DEPRECATED")
    console.warn = originalWarn
  })
})
