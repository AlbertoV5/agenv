import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import {
  generateSessionId,
  startTaskSession,
  completeTaskSession,
  getCurrentTaskSession,
  getTaskSessions,
  writeTasksFile,
  readTasksFile,
  startTaskSessionLocked,
  completeTaskSessionLocked,
  startMultipleSessionsLocked,
  completeMultipleSessionsLocked,
} from "../src/lib/tasks"
import type { TasksFile, Task } from "../src/lib/types"

describe("session-tracking", () => {
  let tempDir: string
  let repoRoot: string
  const streamId = "001-test-stream"

  beforeEach(() => {
    // Create temp directory structure
    tempDir = mkdtempSync(join(tmpdir(), "session-test-"))
    repoRoot = tempDir
    const workDir = join(repoRoot, "work", streamId)
    mkdirSync(workDir, { recursive: true })

    // Create initial tasks.json with test tasks
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: streamId,
      last_updated: new Date().toISOString(),
      tasks: [
        {
          id: "01.01.01.01",
          name: "Test task 1",
          thread_name: "Thread One",
          batch_name: "Setup",
          stage_name: "Stage One",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "pending",
          sessions: [],
        },
        {
          id: "01.01.01.02",
          name: "Test task 2",
          thread_name: "Thread One",
          batch_name: "Setup",
          stage_name: "Stage One",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "pending",
          sessions: [],
        },
      ],
    }
    writeTasksFile(repoRoot, streamId, tasksFile)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("generateSessionId", () => {
    test("generates unique session IDs", () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()

      expect(id1).toMatch(/^ses_[a-z0-9]+_[a-z0-9]+$/)
      expect(id2).toMatch(/^ses_[a-z0-9]+_[a-z0-9]+$/)
      expect(id1).not.toEqual(id2)
    })
  })

  describe("startTaskSession", () => {
    test("creates a session with running status", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      expect(session).not.toBeNull()
      expect(session!.sessionId).toMatch(/^ses_/)
      expect(session!.agentName).toBe("test-agent")
      expect(session!.model).toBe("anthropic/claude-sonnet-4")
      expect(session!.status).toBe("running")
      expect(session!.startedAt).toBeDefined()
      expect(session!.completedAt).toBeUndefined()
    })

    test("sets currentSessionId on the task", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      const tasksFile = readTasksFile(repoRoot, streamId)
      const task = tasksFile!.tasks.find((t) => t.id === "01.01.01.01")!

      expect(task.currentSessionId).toBe(session!.sessionId)
      expect(task.sessions).toHaveLength(1)
      expect(task.sessions![0]!.sessionId).toBe(session!.sessionId)
    })

    test("returns null for non-existent task", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "99.99.99.99",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      expect(session).toBeNull()
    })
  })

  describe("completeTaskSession", () => {
    test("updates session status and exit code", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      const completed = completeTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        session!.sessionId,
        "completed",
        0
      )

      expect(completed).not.toBeNull()
      expect(completed!.status).toBe("completed")
      expect(completed!.exitCode).toBe(0)
      expect(completed!.completedAt).toBeDefined()
    })

    test("clears currentSessionId on completion", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      completeTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        session!.sessionId,
        "completed",
        0
      )

      const tasksFile = readTasksFile(repoRoot, streamId)
      const task = tasksFile!.tasks.find((t) => t.id === "01.01.01.01")

      expect(task!.currentSessionId).toBeUndefined()
    })

    test("handles failed status with non-zero exit code", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      const completed = completeTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        session!.sessionId,
        "failed",
        1
      )

      expect(completed!.status).toBe("failed")
      expect(completed!.exitCode).toBe(1)
    })
  })

  describe("getCurrentTaskSession", () => {
    test("returns current running session", () => {
      const started = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      const current = getCurrentTaskSession(repoRoot, streamId, "01.01.01.01")

      expect(current).not.toBeNull()
      expect(current!.sessionId).toBe(started!.sessionId)
    })

    test("returns null after session completed", () => {
      const session = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4"
      )

      completeTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        session!.sessionId,
        "completed",
        0
      )

      const current = getCurrentTaskSession(repoRoot, streamId, "01.01.01.01")

      expect(current).toBeNull()
    })
  })

  describe("getTaskSessions", () => {
    test("returns all sessions for a task", () => {
      // Start and complete first session
      const session1 = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "agent-1",
        "model-1"
      )
      completeTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        session1!.sessionId,
        "failed",
        1
      )

      // Start second session (retry)
      const session2 = startTaskSession(
        repoRoot,
        streamId,
        "01.01.01.01",
        "agent-2",
        "model-2"
      )

      const sessions = getTaskSessions(repoRoot, streamId, "01.01.01.01")

      expect(sessions).toHaveLength(2)
      expect(sessions[0]!.agentName).toBe("agent-1")
      expect(sessions[0]!.status).toBe("failed")
      expect(sessions[1]!.agentName).toBe("agent-2")
      expect(sessions[1]!.status).toBe("running")
    })

    test("returns empty array for task with no sessions", () => {
      const sessions = getTaskSessions(repoRoot, streamId, "01.01.01.02")

      expect(sessions).toHaveLength(0)
    })
  })

  describe("locked session operations", () => {
    test("startTaskSessionLocked creates session with provided ID", async () => {
      const sessionId = generateSessionId()
      const session = await startTaskSessionLocked(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4",
        sessionId
      )

      expect(session).not.toBeNull()
      expect(session!.sessionId).toBe(sessionId)
      expect(session!.status).toBe("running")
    })

    test("completeTaskSessionLocked updates session", async () => {
      const sessionId = generateSessionId()
      await startTaskSessionLocked(
        repoRoot,
        streamId,
        "01.01.01.01",
        "test-agent",
        "anthropic/claude-sonnet-4",
        sessionId
      )

      const completed = await completeTaskSessionLocked(
        repoRoot,
        streamId,
        "01.01.01.01",
        sessionId,
        "completed",
        0
      )

      expect(completed).not.toBeNull()
      expect(completed!.status).toBe("completed")
      expect(completed!.exitCode).toBe(0)
    })

    test("startMultipleSessionsLocked creates multiple sessions atomically", async () => {
      const session1Id = generateSessionId()
      const session2Id = generateSessionId()

      const sessions = await startMultipleSessionsLocked(repoRoot, streamId, [
        {
          taskId: "01.01.01.01",
          agentName: "agent-1",
          model: "model-1",
          sessionId: session1Id,
        },
        {
          taskId: "01.01.01.02",
          agentName: "agent-2",
          model: "model-2",
          sessionId: session2Id,
        },
      ])

      expect(sessions).toHaveLength(2)
      expect(sessions[0]!.sessionId).toBe(session1Id)
      expect(sessions[1]!.sessionId).toBe(session2Id)

      // Verify both tasks have sessions
      const tasksFile = readTasksFile(repoRoot, streamId)
      const task1 = tasksFile!.tasks.find((t) => t.id === "01.01.01.01")
      const task2 = tasksFile!.tasks.find((t) => t.id === "01.01.01.02")

      expect(task1!.currentSessionId).toBe(session1Id)
      expect(task2!.currentSessionId).toBe(session2Id)
    })

    test("completeMultipleSessionsLocked updates multiple sessions atomically", async () => {
      const session1Id = generateSessionId()
      const session2Id = generateSessionId()

      // Start sessions first
      await startMultipleSessionsLocked(repoRoot, streamId, [
        {
          taskId: "01.01.01.01",
          agentName: "agent-1",
          model: "model-1",
          sessionId: session1Id,
        },
        {
          taskId: "01.01.01.02",
          agentName: "agent-2",
          model: "model-2",
          sessionId: session2Id,
        },
      ])

      // Complete both sessions
      const completed = await completeMultipleSessionsLocked(repoRoot, streamId, [
        {
          taskId: "01.01.01.01",
          sessionId: session1Id,
          status: "completed",
          exitCode: 0,
        },
        {
          taskId: "01.01.01.02",
          sessionId: session2Id,
          status: "failed",
          exitCode: 1,
        },
      ])

      expect(completed).toHaveLength(2)
      expect(completed[0]!.status).toBe("completed")
      expect(completed[0]!.exitCode).toBe(0)
      expect(completed[1]!.status).toBe("failed")
      expect(completed[1]!.exitCode).toBe(1)

      // Verify currentSessionId is cleared
      const tasksFile = readTasksFile(repoRoot, streamId)
      const task1 = tasksFile!.tasks.find((t) => t.id === "01.01.01.01")
      const task2 = tasksFile!.tasks.find((t) => t.id === "01.01.01.02")

      expect(task1!.currentSessionId).toBeUndefined()
      expect(task2!.currentSessionId).toBeUndefined()
    })

    test("handles non-existent tasks gracefully", async () => {
      const sessions = await startMultipleSessionsLocked(repoRoot, streamId, [
        {
          taskId: "99.99.99.99",
          agentName: "agent",
          model: "model",
          sessionId: generateSessionId(),
        },
      ])

      expect(sessions).toHaveLength(0)
    })
  })
})
