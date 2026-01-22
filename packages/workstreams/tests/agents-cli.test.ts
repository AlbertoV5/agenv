import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test"
import {
  existsSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
} from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { main as agentsMain } from "../src/cli/agents.ts"

describe("work agents CLI", () => {
  let tempDir: string
  let workDir: string
  let consoleLogs: string[]
  let consoleErrors: string[]
  let originalLog: typeof console.log
  let originalError: typeof console.error

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "work-agents-cli-test-"))
    mkdirSync(join(tempDir, ".git"))
    workDir = join(tempDir, "work")
    mkdirSync(workDir, { recursive: true })
    
    // Capture console output
    consoleLogs = []
    consoleErrors = []
    originalLog = console.log
    originalError = console.error
    console.log = (...args: unknown[]) => {
      consoleLogs.push(args.map(String).join(" "))
    }
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(" "))
    }
  })

  afterEach(() => {
    console.log = originalLog
    console.error = originalError
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe("with agents.yaml", () => {
    beforeEach(() => {
      const agentsYaml = `agents:
  - name: backend-expert
    description: Specializes in database schema design and API development
    best_for: Database setup, migration scripts, API endpoints
    models:
      - anthropic/claude-sonnet-4
      - anthropic/claude-opus
  - name: frontend-dev
    description: UI component development specialist
    best_for: React components, styling, accessibility
    models:
      - model: google/gemini-flash
        variant: high
`
      writeFileSync(join(workDir, "agents.yaml"), agentsYaml)
    })

    it("should list agents in human-readable format without models", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir])

      const output = consoleLogs.join("\n")
      expect(output).toContain("Available Agents:")
      expect(output).toContain("- backend-expert")
      expect(output).toContain("Description: Specializes in database schema design and API development")
      expect(output).toContain("Best for: Database setup, migration scripts, API endpoints")
      expect(output).toContain("- frontend-dev")
      // Models should NOT be shown to avoid biasing planner agents
      expect(output).not.toContain("Models:")
    })

    it("should list agents in JSON format without models", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir, "--json"])

      const output = consoleLogs.join("\n")
      const parsed = JSON.parse(output)
      
      expect(parsed.agents).toHaveLength(2)
      
      expect(parsed.agents[0].name).toBe("backend-expert")
      expect(parsed.agents[0].description).toBe("Specializes in database schema design and API development")
      expect(parsed.agents[0].best_for).toBe("Database setup, migration scripts, API endpoints")
      
      expect(parsed.agents[1].name).toBe("frontend-dev")
      
      // Models should NOT be included to avoid biasing planner agents
      expect(parsed.agents[0].models).toBeUndefined()
      expect(parsed.agents[1].models).toBeUndefined()
    })

    it("should support -j shorthand for --json", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir, "-j"])

      const output = consoleLogs.join("\n")
      const parsed = JSON.parse(output)
      expect(parsed.agents).toHaveLength(2)
    })
  })

  describe("without agents.yaml", () => {
    it("should show helpful message when agents.yaml is missing", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir])

      const output = consoleLogs.join("\n")
      expect(output).toContain("No agents defined.")
      expect(output).toContain("agents.yaml")
      expect(output).toContain("Example agents.yaml:")
      expect(output).toContain("work init")
    })

    it("should return empty array in JSON mode when agents.yaml is missing", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir, "--json"])

      const output = consoleLogs.join("\n")
      const parsed = JSON.parse(output)
      expect(parsed.agents).toEqual([])
    })
  })

  describe("with empty agents list", () => {
    beforeEach(() => {
      writeFileSync(join(workDir, "agents.yaml"), "agents: []")
    })

    it("should show helpful message when agents list is empty", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir])

      const output = consoleLogs.join("\n")
      expect(output).toContain("No agents defined.")
    })

    it("should return empty array in JSON mode", () => {
      agentsMain(["bun", "work", "agents", "--repo-root", tempDir, "--json"])

      const output = consoleLogs.join("\n")
      const parsed = JSON.parse(output)
      expect(parsed.agents).toEqual([])
    })
  })

  describe("argument parsing", () => {
    beforeEach(() => {
      writeFileSync(join(workDir, "agents.yaml"), "agents: []")
    })

    it("should require value for --repo-root", () => {
      const mockExit = spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called")
      })

      try {
        agentsMain(["bun", "work", "agents", "--repo-root"])
      } catch {
        // Expected
      }

      expect(consoleErrors.join("\n")).toContain("--repo-root requires a value")
      mockExit.mockRestore()
    })
  })
})
