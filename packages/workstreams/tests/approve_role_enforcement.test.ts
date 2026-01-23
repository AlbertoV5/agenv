/**
 * Test role enforcement for approve command
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { main as approveMain } from "../src/cli/approve.ts"

describe("approve command role enforcement", () => {
  const originalRole = process.env.WORKSTREAM_ROLE

  beforeEach(() => {
    // Reset environment before each test
    delete process.env.WORKSTREAM_ROLE
  })

  afterEach(() => {
    // Restore original role
    if (originalRole) {
      process.env.WORKSTREAM_ROLE = originalRole
    } else {
      delete process.env.WORKSTREAM_ROLE
    }
  })

  it("should deny access for AGENT role (default)", async () => {
    // Default role is AGENT
    let exitCode = 0
    let errorOutput = ""

    // Mock process.exit
    const originalExit = process.exit
    process.exit = ((code: number) => {
      exitCode = code
      throw new Error("EXIT")
    }) as never

    // Mock console.error
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      errorOutput += args.join(" ") + "\n"
    }

    try {
      await approveMain(["node", "work", "approve"])
    } catch (e) {
      // Expected to throw from process.exit
    }

    // Restore mocks
    process.exit = originalExit
    console.error = originalConsoleError

    expect(exitCode).toBe(1)
    expect(errorOutput).toContain("Access denied")
    expect(errorOutput).toContain("AGENT")
  })

  it("should allow access for USER role", async () => {
    process.env.WORKSTREAM_ROLE = "USER"

    let exitCode = 0
    let errorOutput = ""

    // Mock process.exit
    const originalExit = process.exit
    process.exit = ((code: number) => {
      exitCode = code
      throw new Error("EXIT")
    }) as never

    // Mock console.error
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      errorOutput += args.join(" ") + "\n"
    }

    try {
      await approveMain(["node", "work", "approve"])
    } catch (e) {
      // May exit for other reasons (like missing workstream)
      // but should NOT be due to role denial
    }

    // Restore mocks
    process.exit = originalExit
    console.error = originalConsoleError

    // Should not contain role denial message
    expect(errorOutput).not.toContain("Access denied")
    expect(errorOutput).not.toContain("Approval commands require USER role")
  })

  it("should deny access for explicitly set AGENT role", async () => {
    process.env.WORKSTREAM_ROLE = "AGENT"

    let exitCode = 0
    let errorOutput = ""

    // Mock process.exit
    const originalExit = process.exit
    process.exit = ((code: number) => {
      exitCode = code
      throw new Error("EXIT")
    }) as never

    // Mock console.error
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      errorOutput += args.join(" ") + "\n"
    }

    try {
      await approveMain(["node", "work", "approve"])
    } catch (e) {
      // Expected to throw from process.exit
    }

    // Restore mocks
    process.exit = originalExit
    console.error = originalConsoleError

    expect(exitCode).toBe(1)
    expect(errorOutput).toContain("Access denied")
    expect(errorOutput).toContain("AGENT")
  })
})
