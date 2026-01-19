import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { updateTask } from "../../src/lib/update"
import { getTasks } from "../../src/lib/tasks"
import type { StreamMetadata, TasksFile } from "../../src/lib/types"

describe("breadcrumbs", () => {
  let tempDir: string

  const baseStream: StreamMetadata = {
    id: "001-test-stream",
    name: "test-stream",
    order: 0,
    size: "medium",
    session_estimated: { length: 1, unit: "session", session_minutes: [30, 45], session_iterations: [4, 8] },
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    path: "docs/work/001-test-stream",
    generated_by: { workstreams: "0.1.0" },
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-breadcrumbs-test-"))
    await mkdir(join(tempDir, "docs", "work", "001-test-stream"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("adds breadcrumb when updating task", async () => {
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: "001-test-stream",
      last_updated: new Date().toISOString(),
      tasks: [
        { id: "1.00.1.1", name: "Task 1", thread_name: "T1", batch_name: "B00", stage_name: "S1", created_at: "", updated_at: "", status: "pending" },
      ],
    }

    await writeFile(
      join(tempDir, "docs/work/001-test-stream/tasks.json"),
      JSON.stringify(tasksFile, null, 2)
    )

    updateTask({
      repoRoot: tempDir,
      stream: baseStream,
      taskId: "1.00.1.1",
      status: "in_progress",
      breadcrumb: "Started working on validation logic",
    })

    const tasks = getTasks(tempDir, "001-test-stream")
    expect(tasks[0]?.status).toBe("in_progress")
    expect(tasks[0]?.breadcrumb).toBe("Started working on validation logic")
  })

  test("updates existing breadcrumb", async () => {
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: "001-test-stream",
      last_updated: new Date().toISOString(),
      tasks: [
        { 
            id: "1.00.1.1", 
            name: "Task 1", 
            thread_name: "T1", 
            batch_name: "B00", 
            stage_name: "S1", 
            created_at: "", 
            updated_at: "", 
            status: "in_progress",
            breadcrumb: "Old breadcrumb"
        },
      ],
    }

    await writeFile(
      join(tempDir, "docs/work/001-test-stream/tasks.json"),
      JSON.stringify(tasksFile, null, 2)
    )

    updateTask({
      repoRoot: tempDir,
      stream: baseStream,
      taskId: "1.00.1.1",
      status: "in_progress",
      breadcrumb: "New breadcrumb",
    })

    const tasks = getTasks(tempDir, "001-test-stream")
    expect(tasks[0]?.breadcrumb).toBe("New breadcrumb")
  })

  test("preserves breadcrumb if not provided", async () => {
    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: "001-test-stream",
      last_updated: new Date().toISOString(),
      tasks: [
        { 
            id: "1.00.1.1", 
            name: "Task 1", 
            thread_name: "T1", 
            batch_name: "B00", 
            stage_name: "S1", 
            created_at: "", 
            updated_at: "", 
            status: "in_progress",
            breadcrumb: "Important info"
        },
      ],
    }

    await writeFile(
      join(tempDir, "docs/work/001-test-stream/tasks.json"),
      JSON.stringify(tasksFile, null, 2)
    )

    updateTask({
      repoRoot: tempDir,
      stream: baseStream,
      taskId: "1.00.1.1",
      status: "completed",
    })

    const tasks = getTasks(tempDir, "001-test-stream")
    expect(tasks[0]?.status).toBe("completed")
    expect(tasks[0]?.breadcrumb).toBe("Important info")
  })
})
