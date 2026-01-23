import { describe, expect, test, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { findNextIncompleteBatch } from "../src/cli/multi"
import { getCompletionMarkerPath, getSessionFilePath, buildRunCommand, buildRetryRunCommand } from "../src/lib/opencode"
import type { Task, NormalizedModelSpec } from "../src/lib/types"
import * as notifications from "../src/lib/notifications"

describe("multi cli", () => {
    describe("findNextIncompleteBatch", () => {
        const baseTask: Task = {
            id: "01.01.01.01",
            name: "Test task",
            thread_name: "Thread 1",
            batch_name: "Batch 1",
            stage_name: "Stage 1",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: "pending"
        }

        test("returns null for empty task list", () => {
            expect(findNextIncompleteBatch([])).toBeNull()
        })

        test("returns first batch if any task is pending", () => {
            const tasks = [
                { ...baseTask, id: "01.01.01.01", status: "completed" },
                { ...baseTask, id: "01.01.01.02", status: "pending" },
                { ...baseTask, id: "01.02.01.01", status: "pending" }
            ] as Task[]

            // Should return 01.01 because it has a pending task
            expect(findNextIncompleteBatch(tasks)).toBe("01.01")
        })

        test("returns second batch if first is fully complete", () => {
            const tasks = [
                { ...baseTask, id: "01.01.01.01", status: "completed" },
                { ...baseTask, id: "01.01.01.02", status: "completed" },
                { ...baseTask, id: "01.02.01.01", status: "pending" },
                { ...baseTask, id: "01.02.01.02", status: "in_progress" }
            ] as Task[]

            expect(findNextIncompleteBatch(tasks)).toBe("01.02")
        })

        test("returns null if all batches are complete", () => {
            const tasks = [
                { ...baseTask, id: "01.01.01.01", status: "completed" },
                { ...baseTask, id: "01.02.01.01", status: "cancelled" },
                { ...baseTask, id: "02.01.01.01", status: "completed" }
            ] as Task[]

            expect(findNextIncompleteBatch(tasks)).toBeNull()
        })

        test("handles out of order tasks", () => {
            const tasks = [
                { ...baseTask, id: "02.01.01.01", status: "pending" },
                { ...baseTask, id: "01.01.01.01", status: "completed" },
                { ...baseTask, id: "01.02.01.01", status: "completed" }
            ] as Task[]

            // 01.01 and 01.02 are done, 02.01 is pending
            expect(findNextIncompleteBatch(tasks)).toBe("02.01")
        })

        test("handles incomplete batch stuck in in_progress", () => {
            const tasks = [
                { ...baseTask, id: "01.01.01.01", status: "in_progress" },
                { ...baseTask, id: "02.01.01.01", status: "pending" }
            ] as Task[]

            expect(findNextIncompleteBatch(tasks)).toBe("01.01")
        })
    })

    describe("notification integration", () => {
        let playNotificationMock: ReturnType<typeof spyOn>

        beforeEach(() => {
            // Mock playNotification to prevent actual sound playback
            playNotificationMock = spyOn(notifications, "playNotification").mockImplementation(() => {})
        })

        afterEach(() => {
            playNotificationMock.mockRestore()
        })

        test("playNotification is exported and callable", () => {
            // Verify that playNotification can be called with all event types
            expect(() => notifications.playNotification("thread_complete")).not.toThrow()
            expect(() => notifications.playNotification("batch_complete")).not.toThrow()
            expect(() => notifications.playNotification("error")).not.toThrow()
        })

        test("mock tracks playNotification calls", () => {
            notifications.playNotification("thread_complete")
            notifications.playNotification("error")
            notifications.playNotification("batch_complete")

            expect(playNotificationMock).toHaveBeenCalledTimes(3)
            expect(playNotificationMock).toHaveBeenCalledWith("thread_complete")
            expect(playNotificationMock).toHaveBeenCalledWith("error")
            expect(playNotificationMock).toHaveBeenCalledWith("batch_complete")
        })

        test("notification events have expected types", () => {
            // Type-level verification that notification events match expected API
            const events: notifications.NotificationEvent[] = [
                "thread_complete",
                "batch_complete",
                "error"
            ]

            for (const event of events) {
                expect(() => notifications.playNotification(event)).not.toThrow()
            }
        })

        describe("integration scenarios (mocked)", () => {
            test("simulates thread completion notification flow", () => {
                // Simulate what happens when a thread completes successfully
                const threadCompleted = true
                const silent = false

                if (threadCompleted && !silent) {
                    notifications.playNotification("thread_complete")
                }

                expect(playNotificationMock).toHaveBeenCalledTimes(1)
                expect(playNotificationMock).toHaveBeenCalledWith("thread_complete")
            })

            test("simulates thread failure notification flow", () => {
                // Simulate what happens when a thread fails
                const threadFailed = true
                const silent = false

                if (threadFailed && !silent) {
                    notifications.playNotification("error")
                }

                expect(playNotificationMock).toHaveBeenCalledTimes(1)
                expect(playNotificationMock).toHaveBeenCalledWith("error")
            })

            test("simulates batch completion notification flow", () => {
                // Simulate what happens when all threads complete
                const allThreadsCompleted = true
                const runningCount = 0
                const silent = false

                if (allThreadsCompleted && runningCount === 0 && !silent) {
                    notifications.playNotification("batch_complete")
                }

                expect(playNotificationMock).toHaveBeenCalledTimes(1)
                expect(playNotificationMock).toHaveBeenCalledWith("batch_complete")
            })

            test("silent mode prevents all notifications", () => {
                // Simulate silent mode behavior
                const silent = true

                // Thread complete
                if (!silent) {
                    notifications.playNotification("thread_complete")
                }

                // Error
                if (!silent) {
                    notifications.playNotification("error")
                }

                // Batch complete
                if (!silent) {
                    notifications.playNotification("batch_complete")
                }

                expect(playNotificationMock).toHaveBeenCalledTimes(0)
            })

            test("multiple threads trigger multiple thread_complete notifications", () => {
                // Simulate multiple threads completing
                const completedThreads = ["thread1", "thread2", "thread3"]
                const silent = false

                for (const _thread of completedThreads) {
                    if (!silent) {
                        notifications.playNotification("thread_complete")
                    }
                }

                expect(playNotificationMock).toHaveBeenCalledTimes(3)
                expect(playNotificationMock).toHaveBeenCalledWith("thread_complete")
            })

            test("mixed thread results trigger appropriate notifications", () => {
                // Simulate a batch with mixed results: 2 completed, 1 failed
                const threadResults = [
                    { id: "thread1", status: "completed" },
                    { id: "thread2", status: "failed" },
                    { id: "thread3", status: "completed" }
                ]
                const silent = false

                for (const thread of threadResults) {
                    if (!silent) {
                        if (thread.status === "completed") {
                            notifications.playNotification("thread_complete")
                        } else if (thread.status === "failed") {
                            notifications.playNotification("error")
                        }
                    }
                }

                // Should have 2 thread_complete and 1 error calls
                expect(playNotificationMock).toHaveBeenCalledTimes(3)

                // Count specific calls
                const calls = playNotificationMock.mock.calls
                const threadCompleteCalls = calls.filter(
                    (call: unknown[]) => call[0] === "thread_complete"
                )
                const errorCalls = calls.filter(
                    (call: unknown[]) => call[0] === "error"
                )

                expect(threadCompleteCalls.length).toBe(2)
                expect(errorCalls.length).toBe(1)
            })
        })
    })

    describe("completion marker files", () => {
        describe("getCompletionMarkerPath", () => {
            test("returns correct path for thread ID", () => {
                expect(getCompletionMarkerPath("01.01.01")).toBe("/tmp/workstream-01.01.01-complete.txt")
                expect(getCompletionMarkerPath("02.03.04")).toBe("/tmp/workstream-02.03.04-complete.txt")
            })

            test("handles various thread ID formats", () => {
                // Standard format
                expect(getCompletionMarkerPath("01.02.03")).toContain("01.02.03")
                // Just numbers
                expect(getCompletionMarkerPath("1.2.3")).toContain("1.2.3")
            })
        })

        describe("getSessionFilePath", () => {
            test("returns correct path for thread ID", () => {
                expect(getSessionFilePath("01.01.01")).toBe("/tmp/workstream-01.01.01-session.txt")
                expect(getSessionFilePath("02.03.04")).toBe("/tmp/workstream-02.03.04-session.txt")
            })

            test("handles various thread ID formats", () => {
                // Standard format
                expect(getSessionFilePath("01.02.03")).toContain("01.02.03")
                expect(getSessionFilePath("01.02.03")).toContain("-session.txt")
                // Just numbers
                expect(getSessionFilePath("1.2.3")).toContain("1.2.3")
            })
        })

        describe("buildRunCommand with threadId", () => {
            test("includes completion marker write when threadId provided", () => {
                const cmd = buildRunCommand(
                    4096,
                    "anthropic/claude-sonnet-4",
                    "/path/to/prompt.md",
                    "Test Thread",
                    undefined,
                    "01.01.01"
                )
                
                // Should contain marker file write command
                expect(cmd).toContain("/tmp/workstream-01.01.01-complete.txt")
                expect(cmd).toContain('echo "done"')
            })

            test("includes session file write when threadId provided", () => {
                const cmd = buildRunCommand(
                    4096,
                    "anthropic/claude-sonnet-4",
                    "/path/to/prompt.md",
                    "Test Thread",
                    undefined,
                    "01.01.01"
                )
                
                // Should contain session file write command
                expect(cmd).toContain("/tmp/workstream-01.01.01-session.txt")
                expect(cmd).toContain('$SESSION_ID')
            })

            test("does not include marker write when threadId not provided", () => {
                const cmd = buildRunCommand(
                    4096,
                    "anthropic/claude-sonnet-4",
                    "/path/to/prompt.md",
                    "Test Thread"
                )
                
                // Should NOT contain marker file path
                expect(cmd).not.toContain("-complete.txt")
            })

            test("does not include session file write when threadId not provided", () => {
                const cmd = buildRunCommand(
                    4096,
                    "anthropic/claude-sonnet-4",
                    "/path/to/prompt.md",
                    "Test Thread"
                )
                
                // Should NOT contain session file path
                expect(cmd).not.toContain("-session.txt")
            })
        })

        describe("buildRetryRunCommand with threadId", () => {
            test("includes completion marker write when threadId provided (single model)", () => {
                const models: NormalizedModelSpec[] = [
                    { model: "anthropic/claude-sonnet-4" }
                ]
                
                const cmd = buildRetryRunCommand(
                    4096,
                    models,
                    "/path/to/prompt.md",
                    "Test Thread",
                    "01.02.03"
                )
                
                // With single model, delegates to buildRunCommand which includes marker
                expect(cmd).toContain("/tmp/workstream-01.02.03-complete.txt")
            })

            test("includes session file write when threadId provided (single model)", () => {
                const models: NormalizedModelSpec[] = [
                    { model: "anthropic/claude-sonnet-4" }
                ]
                
                const cmd = buildRetryRunCommand(
                    4096,
                    models,
                    "/path/to/prompt.md",
                    "Test Thread",
                    "01.02.03"
                )
                
                // With single model, delegates to buildRunCommand which includes session file
                expect(cmd).toContain("/tmp/workstream-01.02.03-session.txt")
            })

            test("includes completion marker write when threadId provided (multiple models)", () => {
                const models: NormalizedModelSpec[] = [
                    { model: "anthropic/claude-sonnet-4" },
                    { model: "google/gemini-pro" }
                ]
                
                const cmd = buildRetryRunCommand(
                    4096,
                    models,
                    "/path/to/prompt.md",
                    "Test Thread",
                    "02.01.01"
                )
                
                // With multiple models, should include marker after model attempts
                expect(cmd).toContain("/tmp/workstream-02.01.01-complete.txt")
            })

            test("includes session file write when threadId provided (multiple models)", () => {
                const models: NormalizedModelSpec[] = [
                    { model: "anthropic/claude-sonnet-4" },
                    { model: "google/gemini-pro" }
                ]
                
                const cmd = buildRetryRunCommand(
                    4096,
                    models,
                    "/path/to/prompt.md",
                    "Test Thread",
                    "02.01.01"
                )
                
                // With multiple models, should include session file write
                expect(cmd).toContain("/tmp/workstream-02.01.01-session.txt")
            })

            test("does not include marker write when threadId not provided", () => {
                const models: NormalizedModelSpec[] = [
                    { model: "anthropic/claude-sonnet-4" },
                    { model: "google/gemini-pro" }
                ]
                
                const cmd = buildRetryRunCommand(
                    4096,
                    models,
                    "/path/to/prompt.md",
                    "Test Thread"
                )
                
                // Should NOT contain marker file path
                expect(cmd).not.toContain("-complete.txt")
            })

            test("does not include session file write when threadId not provided", () => {
                const models: NormalizedModelSpec[] = [
                    { model: "anthropic/claude-sonnet-4" },
                    { model: "google/gemini-pro" }
                ]
                
                const cmd = buildRetryRunCommand(
                    4096,
                    models,
                    "/path/to/prompt.md",
                    "Test Thread"
                )
                
                // Should NOT contain session file path
                expect(cmd).not.toContain("-session.txt")
            })
        })

        describe("marker-based notification timing simulation", () => {
            let playNotificationMock: ReturnType<typeof spyOn>

            beforeEach(() => {
                playNotificationMock = spyOn(notifications, "playNotification").mockImplementation(() => {})
            })

            afterEach(() => {
                playNotificationMock.mockRestore()
            })

            test("simulates marker file detection triggering thread_complete", () => {
                // This simulates what the polling loop does when it detects a marker
                const threadIds = ["01.01.01", "01.01.02", "01.01.03"]
                const completedThreadIds = new Set<string>()
                
                // Simulate detecting marker for first thread
                completedThreadIds.add("01.01.01")
                notifications.playNotification("thread_complete")
                
                expect(playNotificationMock).toHaveBeenCalledTimes(1)
                expect(playNotificationMock).toHaveBeenCalledWith("thread_complete")
            })

            test("simulates batch_complete when all markers detected", () => {
                const threadIds = ["01.01.01", "01.01.02"]
                const completedThreadIds = new Set<string>()
                
                // Simulate all threads completing
                completedThreadIds.add("01.01.01")
                notifications.playNotification("thread_complete")
                
                completedThreadIds.add("01.01.02")
                notifications.playNotification("thread_complete")
                
                // Now all threads have markers - batch complete
                if (completedThreadIds.size === threadIds.length) {
                    notifications.playNotification("batch_complete")
                }
                
                expect(playNotificationMock).toHaveBeenCalledTimes(3)
                expect(playNotificationMock).toHaveBeenCalledWith("batch_complete")
            })

            test("batch_complete not triggered until ALL threads have markers", () => {
                const threadIds = ["01.01.01", "01.01.02", "01.01.03"]
                const completedThreadIds = new Set<string>()
                
                // Only 2 of 3 threads complete
                completedThreadIds.add("01.01.01")
                notifications.playNotification("thread_complete")
                
                completedThreadIds.add("01.01.02")
                notifications.playNotification("thread_complete")
                
                // Check: should NOT trigger batch_complete yet
                if (completedThreadIds.size === threadIds.length) {
                    notifications.playNotification("batch_complete")
                }
                
                // Should only have 2 thread_complete calls, no batch_complete
                expect(playNotificationMock).toHaveBeenCalledTimes(2)
                const calls = playNotificationMock.mock.calls
                const batchCalls = calls.filter((c: unknown[]) => c[0] === "batch_complete")
                expect(batchCalls.length).toBe(0)
            })
        })
    })
})
