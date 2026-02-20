/**
 * Tests for interactive UI functions
 */

import { describe, test, expect } from "bun:test"
import {
  calculateThreadStatus,
  getLastAgent,
  getSessionCount,
  buildThreadStatuses,
} from "../src/lib/interactive.ts"
import type { Task, SessionRecord } from "../src/lib/types.ts"

describe("interactive UI functions", () => {
  describe("calculateThreadStatus", () => {
    test("returns 'completed' when all tasks are completed", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "completed",
        },
        {
          id: "01.01.01.02",
          name: "Task 2",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "completed",
        },
      ]

      expect(calculateThreadStatus(tasks)).toBe("completed")
    })

    test("returns 'failed' when a task has a failed session", () => {
      const session: SessionRecord = {
        sessionId: "session-1",
        agentName: "test-agent",
        model: "anthropic/claude-sonnet-4",
        startedAt: "2024-01-01T00:00:00Z",
        completedAt: "2024-01-01T00:01:00Z",
        status: "failed",
        exitCode: 1,
      }

      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "in_progress",
          sessions: [session],
        },
      ]

      expect(calculateThreadStatus(tasks)).toBe("failed")
    })

    test("returns 'incomplete' when tasks are pending", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "pending",
        },
      ]

      expect(calculateThreadStatus(tasks)).toBe("incomplete")
    })

    test("returns 'incomplete' for empty task list", () => {
      expect(calculateThreadStatus([])).toBe("incomplete")
    })
  })

  describe("getLastAgent", () => {
    test("returns the agent from the last session", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "in_progress",
          sessions: [
            {
              sessionId: "session-1",
              agentName: "first-agent",
              model: "anthropic/claude-sonnet-4",
              startedAt: "2024-01-01T00:00:00Z",
              status: "completed",
            },
            {
              sessionId: "session-2",
              agentName: "second-agent",
              model: "anthropic/claude-sonnet-4",
              startedAt: "2024-01-01T00:01:00Z",
              status: "running",
            },
          ],
        },
      ]

      expect(getLastAgent(tasks)).toBe("second-agent")
    })

    test("returns undefined when no sessions exist", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "pending",
        },
      ]

      expect(getLastAgent(tasks)).toBeUndefined()
    })

    test("returns undefined for empty task list", () => {
      expect(getLastAgent([])).toBeUndefined()
    })
  })

  describe("getSessionCount", () => {
    test("counts all sessions across tasks", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "in_progress",
          sessions: [
            {
              sessionId: "session-1",
              agentName: "agent-1",
              model: "anthropic/claude-sonnet-4",
              startedAt: "2024-01-01T00:00:00Z",
              status: "completed",
            },
            {
              sessionId: "session-2",
              agentName: "agent-2",
              model: "anthropic/claude-sonnet-4",
              startedAt: "2024-01-01T00:01:00Z",
              status: "completed",
            },
          ],
        },
        {
          id: "01.01.01.02",
          name: "Task 2",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "pending",
          sessions: [
            {
              sessionId: "session-3",
              agentName: "agent-3",
              model: "anthropic/claude-sonnet-4",
              startedAt: "2024-01-01T00:02:00Z",
              status: "running",
            },
          ],
        },
      ]

      expect(getSessionCount(tasks)).toBe(3)
    })

    test("returns 0 when no sessions exist", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Thread 1",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "pending",
        },
      ]

      expect(getSessionCount(tasks)).toBe(0)
    })

    test("returns 0 for empty task list", () => {
      expect(getSessionCount([])).toBe(0)
    })
  })

  describe("buildThreadStatuses", () => {
    test("builds status information for threads", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Setup Thread",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "completed",
        },
        {
          id: "01.01.02.01",
          name: "Task 2",
          thread_name: "Implementation Thread",
          batch_name: "Batch 1",
          stage_name: "Stage 1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "pending",
          sessions: [
            {
              sessionId: "session-1",
              agentName: "backend-expert",
              model: "anthropic/claude-sonnet-4",
              startedAt: "2024-01-01T00:00:00Z",
              status: "failed",
            },
          ],
        },
      ]

      const threadIds = ["01.01.01", "01.01.02"]
      const statuses = buildThreadStatuses(tasks, threadIds)

      expect(statuses).toHaveLength(2)
      expect(statuses[0]).toMatchObject({
        threadId: "01.01.01",
        threadName: "Setup Thread",
        status: "completed",
        sessionsCount: 0,
      })
      expect(statuses[1]).toMatchObject({
        threadId: "01.01.02",
        threadName: "Implementation Thread",
        status: "failed",
        sessionsCount: 1,
        lastAgent: "backend-expert",
      })
    })

    test("handles threads with no tasks", () => {
      const tasks: Task[] = []
      const threadIds = ["01.01.01"]
      const statuses = buildThreadStatuses(tasks, threadIds)

      expect(statuses).toHaveLength(1)
      expect(statuses[0]).toMatchObject({
        threadId: "01.01.01",
        threadName: "(unknown)",
        status: "incomplete",
        sessionsCount: 0,
      })
    })
  })
})
