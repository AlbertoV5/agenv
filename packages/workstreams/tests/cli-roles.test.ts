import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import { main as workMain } from "../bin/work"
import { main as approveMain } from "../src/cli/approve"
import { main as startMain } from "../src/cli/start"
import { main as completeMain } from "../src/cli/complete"

describe("CLI Role Enforcement Integration", () => {
  let originalEnv: string | undefined
  let originalExit: typeof process.exit
  let originalConsoleError: typeof console.error
  let originalConsoleLog: typeof console.log
  let exitCode: number | undefined
  let errorOutput: string[] = []
  let logOutput: string[] = []

  beforeEach(() => {
    originalEnv = process.env.WORKSTREAM_ROLE
    delete process.env.WORKSTREAM_ROLE // Default to AGENT

    originalExit = process.exit
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`Process.exit(${code})`)
    }) as any

    originalConsoleError = console.error
    console.error = (...args: any[]) => {
      errorOutput.push(args.join(" "))
    }

    originalConsoleLog = console.log
    console.log = (...args: any[]) => {
      logOutput.push(args.join(" "))
    }

    exitCode = undefined
    errorOutput = []
    logOutput = []
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WORKSTREAM_ROLE
    } else {
      process.env.WORKSTREAM_ROLE = originalEnv
    }
    process.exit = originalExit
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  describe("Command Access Control", () => {
    const protectedCommands = [
      { name: "approve", main: approveMain, args: ["node", "work", "approve"] },
      { name: "start", main: startMain, args: ["node", "work", "start"] },
      { name: "complete", main: completeMain, args: ["node", "work", "complete"] },
    ]

    protectedCommands.forEach(({ name, main, args }) => {
      describe(name, () => {
        test(`rejects execution when role is unset (default AGENT)`, async () => {
          delete process.env.WORKSTREAM_ROLE
          try {
            await main(args)
          } catch (e) {
            // Expected process.exit
          }
          expect(exitCode).toBe(1)
          expect(errorOutput.join("\n")).toContain("Access denied")
          expect(errorOutput.join("\n")).toContain("AGENT")
        })

        test(`rejects execution when role is explicitly AGENT`, async () => {
          process.env.WORKSTREAM_ROLE = "AGENT"
          try {
            await main(args)
          } catch (e) {
            // Expected process.exit
          }
          expect(exitCode).toBe(1)
          expect(errorOutput.join("\n")).toContain("Access denied")
          expect(errorOutput.join("\n")).toContain("AGENT")
        })

        test(`allows execution when role is USER`, async () => {
          process.env.WORKSTREAM_ROLE = "USER"
          try {
            await main(args)
          } catch (e) {
            // Expected process.exit or other error, but NOT access denied
          }

          // It might fail due to missing args/files, but should NOT be access denied
          const output = errorOutput.join("\n")
          expect(output).not.toContain("Access denied")
          expect(output).not.toContain(`available for ${name} role`)
        })
      })
    })
  })

  describe("Help Output Filtering", () => {
    test("hides USER-only commands when role is AGENT (default)", async () => {
      delete process.env.WORKSTREAM_ROLE
      try {
        // work --help
        await workMain(["node", "work", "--help"])
      } catch (e) {
        // Expected process.exit(0)
      }

      const output = logOutput.join("\n")
      expect(output).toContain("status")      // Shared command
      expect(output).toContain("list")        // Shared command
      expect(output).not.toContain("approve") // USER-only
      expect(output).not.toContain("start")   // USER-only (command list)
      
      // Note: "start" might appear in "Start execution" description, so be careful with regex
      // The help output format is "  cmd          description"
      // We check for the command name at the start of the line with padding
      expect(output).not.toMatch(/^\s+approve\s+/m)
      expect(output).not.toMatch(/^\s+start\s+/m)
      expect(output).not.toMatch(/^\s+complete\s+/m)
    })

    test("shows all commands when role is USER", async () => {
      process.env.WORKSTREAM_ROLE = "USER"
      try {
        await workMain(["node", "work", "--help"])
      } catch (e) {
        // Expected process.exit(0)
      }

      const output = logOutput.join("\n")
      expect(output).toMatch(/^\s+status\s+/m)
      expect(output).toMatch(/^\s+approve\s+/m)
      expect(output).toMatch(/^\s+start\s+/m)
      expect(output).toMatch(/^\s+complete\s+/m)
      expect(output).toContain("[USER]") // Check for USER indicator
    })

    test("shows all commands with --show-all-commands flag even as AGENT", async () => {
      delete process.env.WORKSTREAM_ROLE
      try {
        await workMain(["node", "work", "--help", "--show-all-commands"])
      } catch (e) {
        // Expected process.exit(0)
      }

      const output = logOutput.join("\n")
      expect(output).toMatch(/^\s+approve\s+/m)
      expect(output).toContain("(showing all commands)")
    })
  })
})
