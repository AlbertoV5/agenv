import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import {
  getCurrentRole,
  canExecuteCommand,
  getRoleDenialMessage,
  getCommandsForRole,
  getAllCommands,
  COMMAND_PERMISSIONS,
  type WorkstreamRole,
} from "../src/lib/roles"

describe("roles", () => {
  // Store original env value to restore after tests
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.WORKSTREAM_ROLE
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WORKSTREAM_ROLE
    } else {
      process.env.WORKSTREAM_ROLE = originalEnv
    }
  })

  describe("getCurrentRole", () => {
    test("returns AGENT by default when env not set", () => {
      delete process.env.WORKSTREAM_ROLE
      expect(getCurrentRole()).toBe("AGENT")
    })

    test("returns AGENT when env is empty string", () => {
      process.env.WORKSTREAM_ROLE = ""
      expect(getCurrentRole()).toBe("AGENT")
    })

    test("returns USER when env is USER", () => {
      process.env.WORKSTREAM_ROLE = "USER"
      expect(getCurrentRole()).toBe("USER")
    })

    test("returns USER when env is user (lowercase)", () => {
      process.env.WORKSTREAM_ROLE = "user"
      expect(getCurrentRole()).toBe("USER")
    })

    test("returns USER when env is User (mixed case)", () => {
      process.env.WORKSTREAM_ROLE = "User"
      expect(getCurrentRole()).toBe("USER")
    })

    test("returns AGENT for any other value", () => {
      process.env.WORKSTREAM_ROLE = "ADMIN"
      expect(getCurrentRole()).toBe("AGENT")

      process.env.WORKSTREAM_ROLE = "agent"
      expect(getCurrentRole()).toBe("AGENT")

      process.env.WORKSTREAM_ROLE = "something"
      expect(getCurrentRole()).toBe("AGENT")
    })
  })

  describe("canExecuteCommand", () => {
    describe("as AGENT role", () => {
      beforeEach(() => {
        delete process.env.WORKSTREAM_ROLE // defaults to AGENT
      })

      test("cannot execute USER-only commands", () => {
        expect(canExecuteCommand("approve")).toBe(false)
        expect(canExecuteCommand("start")).toBe(false)
        expect(canExecuteCommand("complete")).toBe(false)
      })

      test("can execute commands available to both roles", () => {
        expect(canExecuteCommand("status")).toBe(true)
        expect(canExecuteCommand("list")).toBe(true)
        expect(canExecuteCommand("tree")).toBe(true)
        expect(canExecuteCommand("update")).toBe(true)
      })

      test("can execute unknown commands (default allow)", () => {
        expect(canExecuteCommand("unknown-command")).toBe(true)
        expect(canExecuteCommand("custom")).toBe(true)
      })
    })

    describe("as USER role", () => {
      beforeEach(() => {
        process.env.WORKSTREAM_ROLE = "USER"
      })

      test("can execute USER-only commands", () => {
        expect(canExecuteCommand("approve")).toBe(true)
        expect(canExecuteCommand("start")).toBe(true)
        expect(canExecuteCommand("complete")).toBe(true)
      })

      test("can execute commands available to both roles", () => {
        expect(canExecuteCommand("status")).toBe(true)
        expect(canExecuteCommand("list")).toBe(true)
        expect(canExecuteCommand("tree")).toBe(true)
        expect(canExecuteCommand("update")).toBe(true)
      })

      test("can execute unknown commands (default allow)", () => {
        expect(canExecuteCommand("unknown-command")).toBe(true)
      })
    })
  })

  describe("getRoleDenialMessage", () => {
    beforeEach(() => {
      delete process.env.WORKSTREAM_ROLE // defaults to AGENT
    })

    test("returns custom denial message for approve command", () => {
      const message = getRoleDenialMessage("approve")
      expect(message).toContain("Access denied")
      expect(message).toContain("human-in-the-loop")
      expect(message).toContain("Current role: AGENT")
      expect(message).toContain("WORKSTREAM_ROLE")
    })

    test("returns custom denial message for start command", () => {
      const message = getRoleDenialMessage("start")
      expect(message).toContain("Access denied")
      expect(message).toContain("Starting workstreams requires USER role")
      expect(message).toContain("Current role: AGENT")
    })

    test("returns custom denial message for complete command", () => {
      const message = getRoleDenialMessage("complete")
      expect(message).toContain("Access denied")
      expect(message).toContain("Completing workstreams requires USER role")
    })

    test("returns generic message for unknown commands", () => {
      const message = getRoleDenialMessage("unknown")
      expect(message).toContain("Access denied")
      expect(message).toContain("not available for AGENT role")
    })

    test("includes current role in message as USER", () => {
      process.env.WORKSTREAM_ROLE = "USER"
      const message = getRoleDenialMessage("unknown")
      expect(message).toContain("Current role: USER")
    })
  })

  describe("getCommandsForRole", () => {
    test("returns USER-only commands for USER role", () => {
      const commands = getCommandsForRole("USER")
      expect(commands).toContain("approve")
      expect(commands).toContain("start")
      expect(commands).toContain("complete")
      // Also should contain shared commands
      expect(commands).toContain("status")
      expect(commands).toContain("list")
    })

    test("returns only shared commands for AGENT role", () => {
      const commands = getCommandsForRole("AGENT")
      expect(commands).not.toContain("approve")
      expect(commands).not.toContain("start")
      expect(commands).not.toContain("complete")
      // Should contain shared commands
      expect(commands).toContain("status")
      expect(commands).toContain("list")
      expect(commands).toContain("tree")
      expect(commands).toContain("update")
    })

    test("USER role has more commands than AGENT role", () => {
      const userCommands = getCommandsForRole("USER")
      const agentCommands = getCommandsForRole("AGENT")
      expect(userCommands.length).toBeGreaterThan(agentCommands.length)
    })

    test("returns commands sorted alphabetically", () => {
      const commands = getCommandsForRole("USER")
      const sorted = [...commands].sort()
      expect(commands).toEqual(sorted)
    })
  })

  describe("getAllCommands", () => {
    test("returns all registered commands", () => {
      const commands = getAllCommands()
      expect(commands.length).toBe(Object.keys(COMMAND_PERMISSIONS).length)
    })

    test("returns commands sorted alphabetically", () => {
      const commands = getAllCommands()
      const sorted = [...commands].sort()
      expect(commands).toEqual(sorted)
    })

    test("includes both USER-only and shared commands", () => {
      const commands = getAllCommands()
      expect(commands).toContain("approve")
      expect(commands).toContain("status")
      expect(commands).toContain("list")
    })
  })

  describe("COMMAND_PERMISSIONS registry", () => {
    test("approve command is USER-only", () => {
      expect(COMMAND_PERMISSIONS.approve?.allowedRoles).toEqual(["USER"])
    })

    test("start command is USER-only", () => {
      expect(COMMAND_PERMISSIONS.start?.allowedRoles).toEqual(["USER"])
    })

    test("complete command is USER-only", () => {
      expect(COMMAND_PERMISSIONS.complete?.allowedRoles).toEqual(["USER"])
    })

    test("status command is available to both roles", () => {
      expect(COMMAND_PERMISSIONS.status?.allowedRoles).toContain("USER")
      expect(COMMAND_PERMISSIONS.status?.allowedRoles).toContain("AGENT")
    })

    test("USER-only commands have denial messages", () => {
      expect(COMMAND_PERMISSIONS.approve?.denialMessage).toBeDefined()
      expect(COMMAND_PERMISSIONS.start?.denialMessage).toBeDefined()
      expect(COMMAND_PERMISSIONS.complete?.denialMessage).toBeDefined()
    })
  })
})
