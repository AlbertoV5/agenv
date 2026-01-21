import { describe, expect, test, beforeEach, afterEach, spyOn } from "bun:test"
import { main } from "../src/cli/tree.ts"
import * as repo from "../src/lib/repo.ts"
import * as index from "../src/lib/index.ts"
import * as tasks from "../src/lib/tasks.ts"
import type { Task, WorkIndex, StreamMetadata } from "../src/lib/types.ts"

describe("work tree", () => {
    let consoleSpy: any
    let exitSpy: any
    let getRepoRootSpy: any
    let loadIndexSpy: any
    let getResolvedStreamSpy: any
    let getTasksSpy: any

    beforeEach(() => {
        consoleSpy = spyOn(console, "log").mockImplementation(() => { })
        exitSpy = spyOn(process, "exit").mockImplementation((() => { }) as never)
        getRepoRootSpy = spyOn(repo, "getRepoRoot").mockReturnValue("/tmp/test-repo")

        const mockStream: StreamMetadata = {
            id: "001-test",
            name: "test",
            status: "in_progress",
            session_estimated: { length: 1, unit: "session", session_minutes: [30, 45], session_iterations: [4, 8] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            path: "work/001-test",
            generated_by: { workstreams: "0.1.0" },
            size: "short",
            order: 1
        }

        loadIndexSpy = spyOn(index, "loadIndex").mockReturnValue({
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            streams: [mockStream]
        } as WorkIndex)

        getResolvedStreamSpy = spyOn(index, "getResolvedStream").mockReturnValue(mockStream)
    })

    afterEach(() => {
        consoleSpy.mockRestore()
        exitSpy.mockRestore()
        getRepoRootSpy.mockRestore()
        loadIndexSpy.mockRestore()
        getResolvedStreamSpy.mockRestore()
        if (getTasksSpy) getTasksSpy.mockRestore()
    })

    test("displays tree structure correctly", () => {
        const mockTasks: Task[] = [
            {
                id: "01.01.01.01",
                name: "Task 1",
                stage_name: "Planning",
                batch_name: "Setup",
                thread_name: "Init",
                status: "completed",
                created_at: "",
                updated_at: ""
            },
            {
                id: "01.01.01.02",
                name: "Task 2",
                stage_name: "Planning",
                batch_name: "Setup",
                thread_name: "Init",
                status: "in_progress",
                created_at: "",
                updated_at: ""
            }
        ]

        getTasksSpy = spyOn(tasks, "getTasks").mockReturnValue(mockTasks)

        main(["node", "work-tree", "--stream", "001-test"])

        expect(consoleSpy).toHaveBeenCalled()
        const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join("\n")

        // Check for Workstream line
        expect(output).toContain("Workstream: 001-test")

        // Check for Stage
        expect(output).toContain("Stage 01: Planning")

        // Check for Batch
        expect(output).toContain("Batch 01: Setup")

        // Check for Thread
        expect(output).toContain("Thread 01: Init")

        // Check for status icons (implied by functionality, but let's check basic presence)
        // Overall status should be in_progress because one task is in_progress
        expect(output).toContain("[~] Workstream")
    })

    test("handles empty workstream", () => {
        getTasksSpy = spyOn(tasks, "getTasks").mockReturnValue([])

        main(["node", "work-tree", "--stream", "001-test"])

        expect(consoleSpy).toHaveBeenCalledWith("Workstream: 001-test (Empty)")
    })
})
