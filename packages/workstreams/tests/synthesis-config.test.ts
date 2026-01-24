import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import {
  getDefaultNotificationsConfig,
  loadNotificationsConfig,
  isSynthesisEnabled,
  type SynthesisConfig,
  type NotificationsConfig,
} from "../src/lib/notifications"

describe("SynthesisConfig", () => {
  let tempDir: string
  let workDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "synthesis-config-test-"))
    workDir = join(tempDir, "work")
    mkdirSync(workDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("getDefaultNotificationsConfig", () => {
    test("includes synthesis config with enabled: false by default", () => {
      const config = getDefaultNotificationsConfig()

      expect(config.synthesis).toBeDefined()
      expect(config.synthesis?.enabled).toBe(false)
      expect(config.synthesis?.agent).toBeUndefined()
    })

    test("returns complete NotificationsConfig structure", () => {
      const config = getDefaultNotificationsConfig()

      expect(config).toHaveProperty("enabled")
      expect(config).toHaveProperty("providers")
      expect(config).toHaveProperty("events")
      expect(config).toHaveProperty("synthesis")
    })
  })

  describe("loadNotificationsConfig - synthesis merging", () => {
    test("returns default synthesis config when file does not exist", () => {
      const config = loadNotificationsConfig(tempDir)

      expect(config.synthesis).toBeDefined()
      expect(config.synthesis?.enabled).toBe(false)
      expect(config.synthesis?.agent).toBeUndefined()
    })

    test("returns default synthesis config when file has no synthesis section", () => {
      const partialConfig = {
        enabled: true,
        providers: {
          sound: { enabled: true },
        },
        events: {
          thread_complete: true,
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(partialConfig)
      )

      const config = loadNotificationsConfig(tempDir)

      expect(config.synthesis).toBeDefined()
      expect(config.synthesis?.enabled).toBe(false)
      expect(config.synthesis?.agent).toBeUndefined()
    })

    test("loads synthesis.enabled = true from config file", () => {
      const configWithSynthesis = {
        enabled: true,
        providers: {},
        events: {},
        synthesis: {
          enabled: true,
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(configWithSynthesis)
      )

      const config = loadNotificationsConfig(tempDir)

      expect(config.synthesis?.enabled).toBe(true)
      expect(config.synthesis?.agent).toBeUndefined()
    })

    test("loads synthesis.agent override from config file", () => {
      const configWithAgent = {
        enabled: true,
        providers: {},
        events: {},
        synthesis: {
          enabled: true,
          agent: "custom-synthesis-agent",
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(configWithAgent)
      )

      const config = loadNotificationsConfig(tempDir)

      expect(config.synthesis?.enabled).toBe(true)
      expect(config.synthesis?.agent).toBe("custom-synthesis-agent")
    })

    test("merges partial synthesis config with defaults", () => {
      // Only enabled is set, agent should come from defaults (undefined)
      const partialSynthesis = {
        enabled: true,
        providers: {},
        events: {},
        synthesis: {
          enabled: true,
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(partialSynthesis)
      )

      const config = loadNotificationsConfig(tempDir)

      expect(config.synthesis?.enabled).toBe(true)
      expect(config.synthesis?.agent).toBeUndefined()
    })

    test("returns default config for invalid JSON", () => {
      writeFileSync(join(workDir, "notifications.json"), "not valid json {")

      const config = loadNotificationsConfig(tempDir)

      expect(config.synthesis?.enabled).toBe(false)
      expect(config.synthesis?.agent).toBeUndefined()
    })
  })

  describe("isSynthesisEnabled", () => {
    test("returns false when config file does not exist", () => {
      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)
    })

    test("returns false when synthesis section is missing", () => {
      const configWithoutSynthesis = {
        enabled: true,
        providers: {},
        events: {},
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(configWithoutSynthesis)
      )

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)
    })

    test("returns false when synthesis.enabled is false", () => {
      const config = {
        enabled: true,
        providers: {},
        events: {},
        synthesis: {
          enabled: false,
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(config)
      )

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)
    })

    test("returns true when synthesis.enabled is true", () => {
      const config = {
        enabled: true,
        providers: {},
        events: {},
        synthesis: {
          enabled: true,
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(config)
      )

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(true)
    })

    test("returns true when synthesis.enabled is true with agent override", () => {
      const config = {
        enabled: true,
        providers: {},
        events: {},
        synthesis: {
          enabled: true,
          agent: "my-custom-agent",
        },
      }
      writeFileSync(
        join(workDir, "notifications.json"),
        JSON.stringify(config)
      )

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(true)
    })

    test("returns false for invalid JSON config", () => {
      writeFileSync(join(workDir, "notifications.json"), "invalid json")

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)
    })
  })
})
