import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import {
  getDefaultSynthesisConfig,
  getSynthesisConfigPath,
  loadSynthesisConfig,
  isSynthesisEnabled,
  getSynthesisAgentOverride,
} from "../../src/lib/synthesis/config"

describe("Synthesis Config", () => {
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

  describe("getSynthesisConfigPath", () => {
    test("returns path to work/synthesis.json", () => {
      const result = getSynthesisConfigPath("/repo/root")
      expect(result).toBe("/repo/root/work/synthesis.json")
    })
  })

  describe("getDefaultSynthesisConfig", () => {
    test("returns config with enabled: false by default", () => {
      const config = getDefaultSynthesisConfig()

      expect(config.enabled).toBe(false)
      expect(config.agent).toBeUndefined()
      expect(config.output).toBeUndefined()
    })

    test("returns a new object each time", () => {
      const config1 = getDefaultSynthesisConfig()
      const config2 = getDefaultSynthesisConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe("loadSynthesisConfig", () => {
    test("returns default config when file does not exist", () => {
      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(false)
      expect(config.agent).toBeUndefined()
      expect(config.output).toBeUndefined()
    })

    test("loads enabled: true from config file", () => {
      const synthConfig = { enabled: true }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(true)
    })

    test("loads agent override from config file", () => {
      const synthConfig = {
        enabled: true,
        agent: "custom-synthesis-agent",
      }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(true)
      expect(config.agent).toBe("custom-synthesis-agent")
    })

    test("loads output config from config file", () => {
      const synthConfig = {
        enabled: true,
        output: {
          store_in_threads: true,
        },
      }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(true)
      expect(config.output?.store_in_threads).toBe(true)
    })

    test("merges partial config with defaults", () => {
      // Only enabled is set
      const partialConfig = { enabled: true }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(partialConfig))

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(true)
      expect(config.agent).toBeUndefined()
      expect(config.output).toBeUndefined()
    })

    test("returns default config for invalid JSON and logs warning", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {})
      writeFileSync(join(workDir, "synthesis.json"), "not valid json {")

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(false)
      expect(config.agent).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls[0]?.[0]).toContain("[synthesis] Warning")

      consoleSpy.mockRestore()
    })

    test("returns default config for empty file and logs warning", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {})
      writeFileSync(join(workDir, "synthesis.json"), "")

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test("handles enabled: false explicitly set", () => {
      const synthConfig = { enabled: false }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(false)
    })

    test("handles missing enabled field - defaults to false", () => {
      const synthConfig = { agent: "some-agent" }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const config = loadSynthesisConfig(tempDir)

      expect(config.enabled).toBe(false)
      expect(config.agent).toBe("some-agent")
    })
  })

  describe("isSynthesisEnabled", () => {
    test("returns false when config file does not exist", () => {
      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)
    })

    test("returns false when enabled is false", () => {
      const synthConfig = { enabled: false }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)
    })

    test("returns true when enabled is true", () => {
      const synthConfig = { enabled: true }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(true)
    })

    test("returns false for invalid JSON", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {})
      writeFileSync(join(workDir, "synthesis.json"), "invalid json")

      const result = isSynthesisEnabled(tempDir)

      expect(result).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe("getSynthesisAgentOverride", () => {
    test("returns undefined when config file does not exist", () => {
      const result = getSynthesisAgentOverride(tempDir)

      expect(result).toBeUndefined()
    })

    test("returns undefined when agent is not configured", () => {
      const synthConfig = { enabled: true }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const result = getSynthesisAgentOverride(tempDir)

      expect(result).toBeUndefined()
    })

    test("returns agent name when configured", () => {
      const synthConfig = {
        enabled: true,
        agent: "custom-synthesis-agent",
      }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const result = getSynthesisAgentOverride(tempDir)

      expect(result).toBe("custom-synthesis-agent")
    })

    test("returns agent even when enabled is false", () => {
      const synthConfig = {
        enabled: false,
        agent: "my-agent",
      }
      writeFileSync(join(workDir, "synthesis.json"), JSON.stringify(synthConfig))

      const result = getSynthesisAgentOverride(tempDir)

      expect(result).toBe("my-agent")
    })

    test("returns undefined for invalid JSON", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {})
      writeFileSync(join(workDir, "synthesis.json"), "{ broken")

      const result = getSynthesisAgentOverride(tempDir)

      expect(result).toBeUndefined()

      consoleSpy.mockRestore()
    })
  })
})
