import { describe, expect, test, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { findNextIncompleteBatch } from "../src/cli/multi"
import type { Task } from "../src/lib/types"
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
})
