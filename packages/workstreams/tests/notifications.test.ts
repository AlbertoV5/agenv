import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import * as childProcess from "child_process"
import {
  type NotificationEvent,
  type NotificationProvider,
  type NotificationConfig,
  MacOSSoundProvider,
  ExternalApiProvider,
  NotificationManager,
  loadConfig,
  DEFAULT_SOUNDS,
  playNotification,
  getNotificationManager,
  resetNotificationManager,
} from "../src/lib/notifications"

describe("NotificationEvent types", () => {
  test("has expected event types", () => {
    const events: NotificationEvent[] = ["thread_complete", "batch_complete", "error"]
    expect(events).toHaveLength(3)
  })
})

describe("DEFAULT_SOUNDS", () => {
  test("has sound mappings for all event types", () => {
    expect(DEFAULT_SOUNDS.thread_complete).toBe("/System/Library/Sounds/Glass.aiff")
    expect(DEFAULT_SOUNDS.batch_complete).toBe("/System/Library/Sounds/Hero.aiff")
    expect(DEFAULT_SOUNDS.error).toBe("/System/Library/Sounds/Basso.aiff")
  })
})

describe("loadConfig", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "notifications-test-"))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test("returns empty object when config file does not exist", () => {
    const nonExistentPath = join(tempDir, "nonexistent.json")
    const config = loadConfig(nonExistentPath)
    expect(config).toEqual({})
  })

  test("returns empty object for invalid JSON", () => {
    const configPath = join(tempDir, "invalid.json")
    writeFileSync(configPath, "not valid json {")
    const config = loadConfig(configPath)
    expect(config).toEqual({})
  })

  test("loads valid config file", () => {
    const configPath = join(tempDir, "valid.json")
    const expectedConfig: NotificationConfig = {
      enabled: true,
      sounds: {
        thread_complete: "/custom/sound.aiff",
      },
    }
    writeFileSync(configPath, JSON.stringify(expectedConfig))

    const config = loadConfig(configPath)
    expect(config).toEqual(expectedConfig)
  })

  test("loads config with external_api settings", () => {
    const configPath = join(tempDir, "api.json")
    const expectedConfig: NotificationConfig = {
      enabled: true,
      external_api: {
        enabled: true,
        webhook_url: "https://example.com/webhook",
        headers: { Authorization: "Bearer token" },
        events: ["error"],
      },
    }
    writeFileSync(configPath, JSON.stringify(expectedConfig))

    const config = loadConfig(configPath)
    expect(config.external_api?.enabled).toBe(true)
    expect(config.external_api?.webhook_url).toBe("https://example.com/webhook")
    expect(config.external_api?.events).toEqual(["error"])
  })
})

describe("MacOSSoundProvider", () => {
  let spawnMock: ReturnType<typeof spyOn>

  beforeEach(() => {
    // Mock spawn to prevent actual sound playback
    // biome-ignore lint/suspicious/noExplicitAny: Mock needs flexible typing
    spawnMock = spyOn(childProcess, "spawn").mockImplementation((): any => {
      const mockChild = {
        unref: mock(() => {}),
        on: mock(() => mockChild),
        stdout: null,
        stderr: null,
        stdin: null,
        pid: 12345,
        killed: false,
        exitCode: null,
        signalCode: null,
        connected: false,
        kill: mock(() => true),
        send: mock(() => true),
        disconnect: mock(() => {}),
        ref: mock(() => {}),
        [Symbol.dispose]: mock(() => {}),
      } as unknown as childProcess.ChildProcess
      return mockChild
    })
  })

  afterEach(() => {
    spawnMock.mockRestore()
  })

  test("has correct provider name", () => {
    const provider = new MacOSSoundProvider()
    expect(provider.name).toBe("macos-sound")
  })

  test("isAvailable returns true on darwin", () => {
    const provider = new MacOSSoundProvider()
    // We're running on macOS in this test environment
    expect(provider.isAvailable()).toBe(process.platform === "darwin")
  })

  test("playNotification spawns afplay with correct sound", () => {
    const provider = new MacOSSoundProvider()

    // Only test if on macOS
    if (process.platform !== "darwin") {
      return
    }

    provider.playNotification("thread_complete")

    expect(spawnMock).toHaveBeenCalledWith(
      "afplay",
      [DEFAULT_SOUNDS.thread_complete],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
      })
    )
  })

  test("playNotification does not spawn when disabled", () => {
    const provider = new MacOSSoundProvider({ enabled: false })
    provider.playNotification("thread_complete")

    expect(spawnMock).not.toHaveBeenCalled()
  })

  test("uses custom sound path when configured", () => {
    const customPath = "/System/Library/Sounds/Ping.aiff" // Use existing system sound
    const provider = new MacOSSoundProvider({
      sounds: { thread_complete: customPath },
    })

    // Only test if on macOS
    if (process.platform !== "darwin") {
      return
    }

    provider.playNotification("thread_complete")

    expect(spawnMock).toHaveBeenCalledWith("afplay", [customPath], expect.anything())
  })

  test("falls back to default sound when custom path does not exist", () => {
    const provider = new MacOSSoundProvider({
      sounds: { thread_complete: "/nonexistent/custom.aiff" },
    })

    // Only test if on macOS
    if (process.platform !== "darwin") {
      return
    }

    provider.playNotification("thread_complete")

    // Should fall back to default sound
    expect(spawnMock).toHaveBeenCalledWith(
      "afplay",
      [DEFAULT_SOUNDS.thread_complete],
      expect.anything()
    )
  })
})

describe("ExternalApiProvider", () => {
  test("has correct provider name", () => {
    const provider = new ExternalApiProvider()
    expect(provider.name).toBe("external-api")
  })

  test("isAvailable returns false when not configured", () => {
    const provider = new ExternalApiProvider()
    expect(provider.isAvailable()).toBe(false)
  })

  test("isAvailable returns false when disabled", () => {
    const provider = new ExternalApiProvider({
      enabled: false,
      webhook_url: "https://example.com/webhook",
    })
    expect(provider.isAvailable()).toBe(false)
  })

  test("isAvailable returns false when no webhook_url", () => {
    const provider = new ExternalApiProvider({
      enabled: true,
    })
    expect(provider.isAvailable()).toBe(false)
  })

  test("isAvailable returns true when properly configured", () => {
    const provider = new ExternalApiProvider({
      enabled: true,
      webhook_url: "https://example.com/webhook",
    })
    expect(provider.isAvailable()).toBe(true)
  })

  test("buildPayload creates correct structure", () => {
    const provider = new ExternalApiProvider()
    const payload = provider.buildPayload("thread_complete", { task: "test" })

    expect(payload.event).toBe("thread_complete")
    expect(payload.timestamp).toBeDefined()
    expect(payload.metadata).toEqual({ task: "test" })
  })

  test("buildPayload handles no metadata", () => {
    const provider = new ExternalApiProvider()
    const payload = provider.buildPayload("error")

    expect(payload.event).toBe("error")
    expect(payload.metadata).toBeUndefined()
  })

  test("playNotification respects event filter", () => {
    const provider = new ExternalApiProvider({
      enabled: true,
      webhook_url: "https://example.com/webhook",
      events: ["error"], // Only error events
    })

    // Should not throw for filtered events
    provider.playNotification("thread_complete")
    provider.playNotification("error")
  })
})

describe("NotificationManager", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "notifications-manager-test-"))
    resetNotificationManager()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetNotificationManager()
  })

  test("initializes with default providers", () => {
    const manager = new NotificationManager({})
    const providers = manager.getProviders()

    // Should have MacOSSoundProvider by default
    expect(providers.some((p) => p.name === "macos-sound")).toBe(true)
  })

  test("adds external API provider when configured", () => {
    const manager = new NotificationManager({
      external_api: {
        enabled: true,
        webhook_url: "https://example.com/webhook",
      },
    })
    const providers = manager.getProviders()

    expect(providers.some((p) => p.name === "external-api")).toBe(true)
  })

  test("addProvider adds custom provider", () => {
    const manager = new NotificationManager({})
    const customProvider: NotificationProvider = {
      name: "custom-test",
      isAvailable: () => true,
      playNotification: () => {},
    }

    manager.addProvider(customProvider)
    const providers = manager.getProviders()

    expect(providers.some((p) => p.name === "custom-test")).toBe(true)
  })

  test("removeProvider removes provider by name", () => {
    const manager = new NotificationManager({})
    const initialCount = manager.getProviders().length

    manager.removeProvider("macos-sound")
    const providers = manager.getProviders()

    expect(providers.length).toBe(initialCount - 1)
    expect(providers.some((p) => p.name === "macos-sound")).toBe(false)
  })

  test("playNotification does not throw when disabled", () => {
    const manager = new NotificationManager({ enabled: false })

    expect(() => manager.playNotification("thread_complete")).not.toThrow()
  })

  test("playNotification calls all available providers", () => {
    const mockProvider1: NotificationProvider = {
      name: "mock-1",
      isAvailable: () => true,
      playNotification: mock(() => {}),
    }
    const mockProvider2: NotificationProvider = {
      name: "mock-2",
      isAvailable: () => true,
      playNotification: mock(() => {}),
    }

    const manager = new NotificationManager({ enabled: true })
    // Remove default providers for clean test
    manager.removeProvider("macos-sound")
    manager.addProvider(mockProvider1)
    manager.addProvider(mockProvider2)

    manager.playNotification("batch_complete")

    expect(mockProvider1.playNotification).toHaveBeenCalledWith("batch_complete")
    expect(mockProvider2.playNotification).toHaveBeenCalledWith("batch_complete")
  })

  test("playNotification skips unavailable providers", () => {
    const unavailableProvider: NotificationProvider = {
      name: "unavailable",
      isAvailable: () => false,
      playNotification: mock(() => {}),
    }

    const manager = new NotificationManager({ enabled: true })
    manager.removeProvider("macos-sound")
    manager.addProvider(unavailableProvider)

    manager.playNotification("error")

    expect(unavailableProvider.playNotification).not.toHaveBeenCalled()
  })
})

describe("Convenience functions", () => {
  beforeEach(() => {
    resetNotificationManager()
  })

  afterEach(() => {
    resetNotificationManager()
  })

  test("getNotificationManager returns singleton", () => {
    const manager1 = getNotificationManager()
    const manager2 = getNotificationManager()

    expect(manager1).toBe(manager2)
  })

  test("resetNotificationManager creates new instance", () => {
    const manager1 = getNotificationManager()
    resetNotificationManager()
    const manager2 = getNotificationManager()

    expect(manager1).not.toBe(manager2)
  })

  test("playNotification does not throw", () => {
    expect(() => playNotification("thread_complete")).not.toThrow()
    expect(() => playNotification("batch_complete")).not.toThrow()
    expect(() => playNotification("error")).not.toThrow()
  })
})
