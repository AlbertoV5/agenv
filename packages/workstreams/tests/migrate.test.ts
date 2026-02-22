import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { createTestWorkstream, cleanupTestWorkstream, type TestWorkspace } from "./helpers/test-workspace.ts"
import { saveIndex } from "../src/lib/index.ts"
import type { WorkIndex } from "../src/lib/types.ts"
import { captureCliOutput } from "./helpers/cli-runner.ts"

describe("migrate CLI", () => {
  let workspace: TestWorkspace
  let repoRoot: string

  beforeEach(() => {
    workspace = createTestWorkstream("stream-migrate")
    repoRoot = workspace.repoRoot

    const index: WorkIndex = {
      version: "1.0.0",
      last_updated: new Date().toISOString(),
      streams: [
        {
          id: "stream-migrate",
          name: "migrate-test",
          order: 1,
          size: "short",
          session_estimated: {
            length: 2,
            unit: "session",
            session_minutes: [30, 45],
            session_iterations: [4, 8],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          path: "work/stream-migrate",
          generated_by: { workstreams: "1.0.0" },
        },
      ],
    }
    saveIndex(repoRoot, index)
  })

  afterEach(() => {
    cleanupTestWorkstream(workspace)
  })

  test("reports zero-task migration when no legacy tasks exist", async () => {
    const { main } = await import("../src/cli/migrate.ts")
    const { stdout } = await captureCliOutput(async () => {
      main(["node", "migrate", "tasks-to-threads", "--stream", "stream-migrate", "--repo-root", repoRoot])
    })

    const output = stdout.join("\n")
    expect(output).toContain("Migrated tasks.json to threads.json")
    expect(output).toContain("Tasks scanned: 0")
  })

  test("migrates legacy tasks.json to threads.json", async () => {
    const tasksPath = join(repoRoot, "work/stream-migrate/tasks.json")
    writeFileSync(
      tasksPath,
      JSON.stringify(
        {
          version: "1.0.0",
          stream_id: "stream-migrate",
          last_updated: new Date().toISOString(),
          tasks: [
            {
              id: "01.01.01.01",
              name: "Legacy task",
              thread_name: "Thread One",
              batch_name: "Batch One",
              stage_name: "Stage One",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              status: "pending",
            },
          ],
        },
        null,
        2,
      ),
    )

    const { main } = await import("../src/cli/migrate.ts")
    const { stdout } = await captureCliOutput(async () => {
      main(["node", "migrate", "tasks-to-threads", "--stream", "stream-migrate", "--repo-root", repoRoot])
    })

    expect(stdout.join("\n")).toContain("Migrated tasks.json to threads.json")
    expect(existsSync(join(repoRoot, "work/stream-migrate/threads.json"))).toBe(true)

    const threads = JSON.parse(readFileSync(join(repoRoot, "work/stream-migrate/threads.json"), "utf-8"))
    expect(threads.threads[0].threadId).toBe("01.01.01")
    expect(threads.threads[0].status).toBe("pending")
  })
})
