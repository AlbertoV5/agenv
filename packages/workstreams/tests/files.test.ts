import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getTaskFilesDir, ensureTaskFilesDir } from "../src/lib/files"
import type { Task } from "../src/lib/types"

describe("files", () => {
  let tempDir: string
  const streamId = "001-test-stream"

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-files-test-"))
    await mkdir(join(tempDir, "work", streamId), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  const task: Task = {
    id: "01.00.01.01",
    name: "Task 1",
    thread_name: "setup-thread",
    batch_name: "preparation",
    stage_name: "1",
    created_at: "",
    updated_at: "",
    status: "in_progress",
  }

  test("generates correct directory path", () => {
    const dir = getTaskFilesDir(tempDir, streamId, task)
    // Expected: work/{streamId}/files/stage-1/00-preparation/setup-thread
    expect(dir).toEndWith(
      `work/${streamId}/files/stage-1/00-preparation/setup-thread`,
    )
  })

  test("creates directory if it does not exist", async () => {
    const dir = ensureTaskFilesDir(tempDir, streamId, task)
    const s = await stat(dir)
    expect(s.isDirectory()).toBe(true)
  })

  test("sanitizes directory names", () => {
    const dirtyTask: Task = {
      ...task,
      batch_name: "Setup & Init!",
      thread_name: "Thread #1 (Auth)",
    }
    const dir = getTaskFilesDir(tempDir, streamId, dirtyTask)
    // "Setup & Init!" -> "setup---init-"
    // "Thread #1 (Auth)" -> "thread--1--auth-"
    expect(dir).toContain("00-setup---init-")
    expect(dir).toContain("thread--1--auth-")
  })
})
