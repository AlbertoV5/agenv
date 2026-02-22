import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getContinueContext } from "../src/lib/continue"
import type { TasksFile } from "../src/lib/types"
import { updateThreadMetadata } from "../src/lib/threads"

describe("getContinueContext", () => {
  let tempDir: string
  const streamId = "001-test-stream"
  const streamName = "test-stream"

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-continue-test-"))
    await mkdir(join(tempDir, "work", streamId), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("returns active task if one exists", async () => {
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: streamId,
      last_updated: new Date().toISOString(),
      tasks: [
        {
          id: "1.1.1",
          name: "Completed Task",
          thread_name: "T1",
          batch_name: "B00",
          stage_name: "S1",
          created_at: "",
          updated_at: "",
          status: "completed",
        },
        {
          id: "1.1.2",
          name: "Active Task",
          thread_name: "T1",
          batch_name: "B00",
          stage_name: "S1",
          created_at: "",
          updated_at: "",
          status: "in_progress",
          breadcrumb: "working on it",
        },
        {
          id: "1.1.3",
          name: "Pending Task",
          thread_name: "T1",
          batch_name: "B00",
          stage_name: "S1",
          created_at: "",
          updated_at: "",
          status: "pending",
        },
      ],
    }

    await writeFile(
      join(tempDir, "work", streamId, "tasks.json"),
      JSON.stringify(tasksFile, null, 2),
    )

    const ctx = getContinueContext(tempDir, streamId, streamName)

    expect(ctx.activeTask).toBeDefined()
    expect(ctx.activeTask?.id).toBe("1.1.2")
    expect(ctx.activeTask?.breadcrumb).toBe("working on it")
    expect(ctx.nextTask?.id).toBe("1.1.3")
    expect(ctx.lastCompletedTask?.id).toBe("1.1.1")
  })

  test("returns next pending task if no active task", async () => {
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: streamId,
      last_updated: new Date().toISOString(),
      tasks: [
        {
          id: "1.1.1",
          name: "Completed Task",
          thread_name: "T1",
          batch_name: "B00",
          stage_name: "S1",
          created_at: "",
          updated_at: "",
          status: "completed",
        },
        {
          id: "1.1.2",
          name: "Pending Task",
          thread_name: "T1",
          batch_name: "B00",
          stage_name: "S1",
          created_at: "",
          updated_at: "",
          status: "pending",
        },
      ],
    }

    await writeFile(
      join(tempDir, "work", streamId, "tasks.json"),
      JSON.stringify(tasksFile, null, 2),
    )

    const ctx = getContinueContext(tempDir, streamId, streamName)

    expect(ctx.activeTask).toBeUndefined()
    expect(ctx.nextTask?.id).toBe("1.1.2")
    expect(ctx.lastCompletedTask?.id).toBe("1.1.1")
  })

  test("returns last completed task even if no pending tasks", async () => {
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: streamId,
      last_updated: new Date().toISOString(),
      tasks: [
        {
          id: "1.1.1",
          name: "Completed Task",
          thread_name: "T1",
          batch_name: "B00",
          stage_name: "S1",
          created_at: "",
          updated_at: "",
          status: "completed",
        },
      ],
    }

    await writeFile(
      join(tempDir, "work", streamId, "tasks.json"),
      JSON.stringify(tasksFile, null, 2),
    )

    const ctx = getContinueContext(tempDir, streamId, streamName)

    expect(ctx.activeTask).toBeUndefined()
    expect(ctx.nextTask).toBeUndefined()
    expect(ctx.lastCompletedTask?.id).toBe("1.1.1")
  })

  test("prefers thread metadata when threads.json exists", async () => {
    updateThreadMetadata(tempDir, streamId, "01.01.01", {
      threadName: "Core",
      stageName: "Build",
      batchName: "Batch 01",
      status: "in_progress",
      assignedAgent: "backend-agent",
      sessions: [],
    })
    updateThreadMetadata(tempDir, streamId, "01.01.02", {
      threadName: "Tests",
      stageName: "Build",
      batchName: "Batch 01",
      status: "pending",
      sessions: [],
    })

    const ctx = getContinueContext(tempDir, streamId, streamName)

    expect(ctx.activeThread?.threadId).toBe("01.01.01")
    expect(ctx.nextThread?.threadId).toBe("01.01.02")
    expect(ctx.activeTask?.id).toBe("01.01.01.01")
    expect(ctx.assignedAgent).toBe("backend-agent")
  })
})
