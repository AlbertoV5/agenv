import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseTaskId, updateTask } from "../../src/lib/update"
import type { PlanMetadata } from "../../src/lib/types"

describe("parseTaskId", () => {
  describe("short plan format (taskGroup.subtask)", () => {
    test("parses simple two-part ID", () => {
      const result = parseTaskId("1.2")
      expect(result).toEqual({
        taskGroup: 1,
        subtask: 2,
      })
    })

    test("parses larger numbers", () => {
      const result = parseTaskId("5.10")
      expect(result).toEqual({
        taskGroup: 5,
        subtask: 10,
      })
    })
  })

  describe("medium/long plan format (stage.taskGroup.subtask)", () => {
    test("parses three-part ID", () => {
      const result = parseTaskId("2.1.3")
      expect(result).toEqual({
        stage: 2,
        taskGroup: 1,
        subtask: 3,
      })
    })

    test("parses larger stage numbers", () => {
      const result = parseTaskId("4.3.5")
      expect(result).toEqual({
        stage: 4,
        taskGroup: 3,
        subtask: 5,
      })
    })
  })

  describe("error handling", () => {
    test("throws on single number", () => {
      expect(() => parseTaskId("1")).toThrow(
        'Invalid task ID format: 1. Expected "1.2" or "2.1.3"',
      )
    })

    test("throws on four-part ID", () => {
      expect(() => parseTaskId("1.2.3.4")).toThrow(
        'Invalid task ID format: 1.2.3.4. Expected "1.2" or "2.1.3"',
      )
    })

    test("parses non-numeric parts as NaN (no validation)", () => {
      // The function uses parseInt which returns NaN for non-numeric strings
      // but doesn't validate - this documents current behavior
      const result = parseTaskId("a.b")
      expect(result.taskGroup).toBeNaN()
      expect(result.subtask).toBeNaN()
    })

    test("handles empty string", () => {
      // Empty string splits to [""] which has length 1, neither 2 nor 3
      expect(() => parseTaskId("")).toThrow("Invalid task ID format")
    })

    test("handles dots by parsing as NaN", () => {
      // ".." splits to ["", "", ""] which has length 3
      const result = parseTaskId("..")
      expect(result.stage).toBeNaN()
      expect(result.taskGroup).toBeNaN()
      expect(result.subtask).toBeNaN()
    })
  })
})

describe("updateTask", () => {
  let tempDir: string
  let checklistPath: string

  const basePlan: PlanMetadata = {
    id: "001-test-plan",
    name: "test-plan",
    order: 0,
    size: "short",
    session: { length: 1, unit: "session", session_minutes: [30, 45], session_iterations: [4, 8] },
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    synthesis: { synthesized: false },
    path: "docs/plans/001-test-plan",
    generated_by: { cli: "0.1.0", planning: "0.1.0" },
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-update-test-"))
    checklistPath = join(tempDir, "docs", "plans", "001-test-plan", "checklist")
    await mkdir(checklistPath, { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("short plan updates", () => {
    test("updates task status from pending to completed", async () => {
      const content = `# Plan Checklist

*Last updated: 2024-01-01*

### Task Group 1
- [ ] First task
- [ ] Second task`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "completed",
      })

      expect(result.updated).toBe(true)
      expect(result.taskId).toBe("1.1")
      expect(result.status).toBe("completed")

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[x] First task")
      expect(updated).toContain("[ ] Second task")
    })

    test("updates task status to in_progress", async () => {
      const content = `### Task Group 1
- [ ] First task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "in_progress",
      })

      expect(result.updated).toBe(true)

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[~] First task")
    })

    test("updates task status to blocked", async () => {
      const content = `### Task Group 1
- [ ] First task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "blocked",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[!] First task")
    })

    test("updates task status to cancelled", async () => {
      const content = `### Task Group 1
- [ ] First task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "cancelled",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[-] First task")
    })

    test("updates second task in group", async () => {
      const content = `### Task Group 1
- [ ] First task
- [ ] Second task
- [ ] Third task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.2",
        status: "completed",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[ ] First task")
      expect(updated).toContain("[x] Second task")
      expect(updated).toContain("[ ] Third task")
    })

    test("updates task in second task group", async () => {
      const content = `### Task Group 1
- [ ] Task 1.1
- [ ] Task 1.2

### Task Group 2
- [ ] Task 2.1
- [ ] Task 2.2

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "2.1",
        status: "completed",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[ ] Task 1.1")
      expect(updated).toContain("[ ] Task 1.2")
      expect(updated).toContain("[x] Task 2.1")
      expect(updated).toContain("[ ] Task 2.2")
    })

    test("throws when task not found", async () => {
      const content = `### Task Group 1
- [ ] First task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      expect(() =>
        updateTask({
          repoRoot: tempDir,
          plan: { ...basePlan, size: "short" },
          taskId: "1.5",
          status: "completed",
        })
      ).toThrow("Task 1.5 not found")
    })

    test("throws when checklist file not found", async () => {
      // Don't create the INDEX.md file

      expect(() =>
        updateTask({
          repoRoot: tempDir,
          plan: { ...basePlan, size: "short" },
          taskId: "1.1",
          status: "completed",
        })
      ).toThrow("Checklist file not found")
    })
  })

  describe("medium plan updates", () => {
    test("updates task in specific stage", async () => {
      const content = `# Plan

| Stage | Title | Status |
|-------|-------|--------|
| 1 | Setup | \`in_progress\` |
| 2 | Implementation | \`pending\` |

## Stage 1

### Task Group 1
- [ ] Stage 1 Task 1
- [ ] Stage 1 Task 2

## Stage 2

### Task Group 1
- [ ] Stage 2 Task 1
- [ ] Stage 2 Task 2

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "medium" },
        taskId: "2.1.1",
        status: "completed",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[ ] Stage 1 Task 1")
      expect(updated).toContain("[x] Stage 2 Task 1")
      expect(updated).toContain("[ ] Stage 2 Task 2")
    })

    test("updates correct task when multiple stages have same task group", async () => {
      const content = `# Plan

## Stage 1

### Task Group 1
- [ ] S1 T1

## Stage 2

### Task Group 1
- [ ] S2 T1

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "medium" },
        taskId: "1.1.1",
        status: "completed",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("[x] S1 T1")
      expect(updated).toContain("[ ] S2 T1")
    })
  })

  describe("long plan updates", () => {
    test("updates task in separate stage file", async () => {
      const indexContent = `# Plan Index

| Stage | File | Title | Status |
|-------|------|-------|--------|
| 1 | STAGE_1.md | Setup | \`in_progress\` |`

      const stageContent = `# Stage 1

### Task Group 1
- [ ] First task
- [ ] Second task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), indexContent)
      await writeFile(join(checklistPath, "STAGE_1.md"), stageContent)

      const result = updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "long" },
        taskId: "1.1.2",
        status: "completed",
      })

      expect(result.updated).toBe(true)
      expect(result.file).toContain("STAGE_1.md")

      const updated = await readFile(join(checklistPath, "STAGE_1.md"), "utf-8")
      expect(updated).toContain("[ ] First task")
      expect(updated).toContain("[x] Second task")
    })

    test("throws when stage not specified for long plan", async () => {
      const indexContent = `# Plan Index

| Stage | File | Title | Status |
|-------|------|-------|--------|
| 1 | STAGE_1.md | Setup | \`pending\` |`

      await writeFile(join(checklistPath, "INDEX.md"), indexContent)

      expect(() =>
        updateTask({
          repoRoot: tempDir,
          plan: { ...basePlan, size: "long" },
          taskId: "1.1",
          status: "completed",
        })
      ).toThrow("Long plans require stage number")
    })

    test("throws when stage file not found", async () => {
      const indexContent = `# Plan Index

| Stage | File | Title | Status |
|-------|------|-------|--------|
| 1 | STAGE_1.md | Setup | \`pending\` |`

      await writeFile(join(checklistPath, "INDEX.md"), indexContent)
      // Don't create STAGE_1.md

      expect(() =>
        updateTask({
          repoRoot: tempDir,
          plan: { ...basePlan, size: "long" },
          taskId: "1.1.1",
          status: "completed",
        })
      ).toThrow("Checklist file not found")
    })
  })

  describe("notes", () => {
    test("adds note to task group", async () => {
      const content = `### Task Group 1
- [ ] First task
- [ ] Second task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "in_progress",
        note: "Started working on this",
      })

      expect(result.note).toBe("Started working on this")

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("**Notes:**")
      expect(updated).toContain("- Started working on this")
    })

    test("adds note to existing notes section", async () => {
      const content = `### Task Group 1
- [ ] First task

**Notes:**

- Existing note

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "completed",
        note: "Task completed successfully",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).toContain("- Existing note")
      expect(updated).toContain("- Task completed successfully")
    })
  })

  describe("timestamp updates", () => {
    test("updates last updated timestamp", async () => {
      const content = `### Task Group 1
- [ ] First task

*Last updated: 2020-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.1",
        status: "completed",
      })

      const updated = await readFile(join(checklistPath, "INDEX.md"), "utf-8")
      expect(updated).not.toContain("2020-01-01")
      expect(updated).toMatch(/\*Last updated: \d{4}-\d{2}-\d{2}\*/)
    })
  })

  describe("line numbers", () => {
    test("returns correct line number for updated task", async () => {
      const content = `# Header

### Task Group 1
- [ ] First task
- [ ] Second task

*Last updated: 2024-01-01*`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = updateTask({
        repoRoot: tempDir,
        plan: { ...basePlan, size: "short" },
        taskId: "1.2",
        status: "completed",
      })

      expect(result.lineNumber).toBe(5)
    })
  })
})
