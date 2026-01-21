import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import {
  getAuthFromEnv,
  getAuthFromGhCli,
  getGitHubAuth,
  validateAuth,
  ensureGitHubAuth,
  GitHubAuthError,
} from "../src/lib/github/auth"
import * as child_process from "node:child_process"

// Mock execSync
const mockExecSync = mock((cmd: string) => "mock-token")
mock.module("node:child_process", () => ({
  execSync: mockExecSync,
}))

describe("GitHub Auth", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.GITHUB_TOKEN
    delete process.env.GH_TOKEN
    mockExecSync.mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
    mock.restore()
  })

  describe("getAuthFromEnv", () => {
    it("should return GITHUB_TOKEN if set", () => {
      process.env.GITHUB_TOKEN = "env-token"
      expect(getAuthFromEnv()).toBe("env-token")
    })

    it("should return GH_TOKEN if set", () => {
      process.env.GH_TOKEN = "gh-token"
      expect(getAuthFromEnv()).toBe("gh-token")
    })

    it("should prioritize GITHUB_TOKEN over GH_TOKEN", () => {
      process.env.GITHUB_TOKEN = "env-token"
      process.env.GH_TOKEN = "gh-token"
      expect(getAuthFromEnv()).toBe("env-token")
    })

    it("should return undefined if neither is set", () => {
      expect(getAuthFromEnv()).toBeUndefined()
    })
  })

  describe("getAuthFromGhCli", () => {
    it("should return token from gh cli", () => {
      mockExecSync.mockReturnValue("cli-token\n")
      expect(getAuthFromGhCli()).toBe("cli-token")
    })

    it("should return undefined if gh cli fails", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("failed")
      })
      expect(getAuthFromGhCli()).toBeUndefined()
    })
  })

  describe("getGitHubAuth", () => {
    it("should prioritize env over cli", () => {
      process.env.GITHUB_TOKEN = "env-token"
      mockExecSync.mockReturnValue("cli-token")
      expect(getGitHubAuth()).toBe("env-token")
    })

    it("should fallback to cli if env is missing", () => {
      mockExecSync.mockReturnValue("cli-token")
      expect(getGitHubAuth()).toBe("cli-token")
    })
  })

  describe("validateAuth", () => {
    it("should return true for valid token", async () => {
      global.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 200 })),
      ) as any
      const isValid = await validateAuth("valid-token")
      expect(isValid).toBe(true)
    })

    it("should return false for invalid token", async () => {
      global.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 401 })),
      ) as any
      const isValid = await validateAuth("invalid-token")
      expect(isValid).toBe(false)
    })

    it("should return false on network error", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network error"))) as any
      const isValid = await validateAuth("token")
      expect(isValid).toBe(false)
    })
  })

  describe("ensureGitHubAuth", () => {
    it("should return token if valid", async () => {
      process.env.GITHUB_TOKEN = "valid-token"
      global.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 200 })),
      ) as any

      const token = await ensureGitHubAuth()
      expect(token).toBe("valid-token")
    })

    it("should throw if no token found", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("failed")
      })
      try {
        await ensureGitHubAuth()
        expect.unreachable()
      } catch (e) {
        expect(e).toBeInstanceOf(GitHubAuthError)
        expect((e as Error).message).toContain("No GitHub authentication found")
      }
    })

    it("should throw if token is invalid", async () => {
      process.env.GITHUB_TOKEN = "invalid-token"
      global.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 401 })),
      ) as any

      try {
        await ensureGitHubAuth()
        expect.unreachable()
      } catch (e) {
        expect(e).toBeInstanceOf(GitHubAuthError)
        expect((e as Error).message).toContain(
          "Invalid GitHub authentication token",
        )
      }
    })
  })
})
