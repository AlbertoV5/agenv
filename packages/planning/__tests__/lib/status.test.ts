import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseTasksFromContent,
  parseShortPlan,
  parseMediumPlan,
  parseLongPlan,
  getPlanProgress,
  formatProgress,
} from "../../src/lib/status"
import type { PlanMetadata, PlanProgress } from "../../src/lib/types"

describe("parseTasksFromContent", () => {
  describe("basic task parsing", () => {
    test("parses single task", () => {
      const content = `### Task Group 1
- [ ] First task`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toEqual({
        id: "1.1",
        description: "First task",
        status: "pending",
        stageNumber: undefined,
        taskGroupNumber: 1,
        subtaskNumber: 1,
        lineNumber: 2,
      })
    })

    test("parses multiple tasks in same group", () => {
      const content = `### Task Group 1
- [ ] First task
- [x] Second task
- [~] Third task`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(3)
      expect(tasks[0]?.id).toBe("1.1")
      expect(tasks[0]?.status).toBe("pending")
      expect(tasks[1]?.id).toBe("1.2")
      expect(tasks[1]?.status).toBe("completed")
      expect(tasks[2]?.id).toBe("1.3")
      expect(tasks[2]?.status).toBe("in_progress")
    })

    test("parses multiple task groups", () => {
      const content = `### Task Group 1
- [ ] Task 1.1
- [ ] Task 1.2

### Task Group 2
- [ ] Task 2.1
- [ ] Task 2.2
- [ ] Task 2.3`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(5)
      expect(tasks[0]?.id).toBe("1.1")
      expect(tasks[1]?.id).toBe("1.2")
      expect(tasks[2]?.id).toBe("2.1")
      expect(tasks[3]?.id).toBe("2.2")
      expect(tasks[4]?.id).toBe("2.3")
    })
  })

  describe("task status parsing", () => {
    test("parses all status types", () => {
      const content = `### Task Group 1
- [ ] Pending task
- [x] Completed task
- [X] Also completed (uppercase)
- [~] In progress task
- [!] Blocked task
- [-] Cancelled task`

      const tasks = parseTasksFromContent(content)
      expect(tasks[0]?.status).toBe("pending")
      expect(tasks[1]?.status).toBe("completed")
      expect(tasks[2]?.status).toBe("completed")
      expect(tasks[3]?.status).toBe("in_progress")
      expect(tasks[4]?.status).toBe("blocked")
      expect(tasks[5]?.status).toBe("cancelled")
    })
  })

  describe("with stage number", () => {
    test("includes stage number in task ID", () => {
      const content = `### Task Group 1
- [ ] First task
- [ ] Second task`

      const tasks = parseTasksFromContent(content, 2)
      expect(tasks[0]?.id).toBe("2.1.1")
      expect(tasks[0]?.stageNumber).toBe(2)
      expect(tasks[1]?.id).toBe("2.1.2")
      expect(tasks[1]?.stageNumber).toBe(2)
    })
  })

  describe("inline stage format", () => {
    test("parses stage header with task group", () => {
      const content = `### Stage 1 - Task Group 1
- [ ] Task in stage 1

### Stage 2 - Task Group 1
- [ ] Task in stage 2`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(2)
      expect(tasks[0]?.taskGroupNumber).toBe(1)
      expect(tasks[1]?.taskGroupNumber).toBe(1)
    })
  })

  describe("edge cases", () => {
    test("handles empty content", () => {
      const tasks = parseTasksFromContent("")
      expect(tasks).toHaveLength(0)
    })

    test("handles content with no tasks", () => {
      const content = `# Plan Title

Some description text.

## Overview

More text without any tasks.`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(0)
    })

    test("ignores non-task list items", () => {
      const content = `### Task Group 1
- [ ] Actual task
- This is not a task (no checkbox)
- Another non-task item
- [x] Another actual task`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(2)
      expect(tasks[0]?.description).toBe("Actual task")
      expect(tasks[1]?.description).toBe("Another actual task")
    })

    test("strips checkbox from description", () => {
      const content = `### Task Group 1
- [ ] Task with **bold** and _italic_`

      const tasks = parseTasksFromContent(content)
      expect(tasks[0]?.description).toBe("Task with **bold** and _italic_")
    })

    test("handles indented task lines", () => {
      const content = `### Task Group 1
  - [ ] Indented task`

      const tasks = parseTasksFromContent(content)
      expect(tasks).toHaveLength(1)
      expect(tasks[0]?.description).toBe("Indented task")
    })
  })

  describe("line numbers", () => {
    test("tracks correct line numbers", () => {
      const content = `# Header

### Task Group 1
- [ ] First task
- [ ] Second task

### Task Group 2
- [ ] Third task`

      const tasks = parseTasksFromContent(content)
      expect(tasks[0]?.lineNumber).toBe(4)
      expect(tasks[1]?.lineNumber).toBe(5)
      expect(tasks[2]?.lineNumber).toBe(8)
    })
  })
})

describe("plan parsing with files", () => {
  let tempDir: string
  let checklistPath: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-status-test-"))
    checklistPath = join(tempDir, "docs", "plans", "001-test", "checklist")
    await mkdir(checklistPath, { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe("parseShortPlan", () => {
    test("returns empty array when INDEX.md does not exist", () => {
      const result = parseShortPlan(checklistPath)
      expect(result).toEqual([])
    })

    test("parses short plan with single implicit stage", async () => {
      const content = `# Plan Checklist

*Last updated: 2024-01-15*

### Task Group 1
- [ ] First task
- [x] Second task

### Task Group 2
- [~] Third task`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseShortPlan(checklistPath)
      expect(result).toHaveLength(1)
      expect(result[0]?.number).toBe(1)
      expect(result[0]?.title).toBe("Implementation")
      expect(result[0]?.file).toBe("INDEX.md")
      expect(result[0]?.tasks).toHaveLength(3)
    })

    test("calculates stage status as complete when all tasks done", async () => {
      const content = `### Task Group 1
- [x] Completed task 1
- [x] Completed task 2`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseShortPlan(checklistPath)
      expect(result[0]?.status).toBe("complete")
    })

    test("calculates stage status as in_progress when some tasks done", async () => {
      const content = `### Task Group 1
- [x] Completed task
- [ ] Pending task`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseShortPlan(checklistPath)
      expect(result[0]?.status).toBe("in_progress")
    })

    test("calculates stage status as blocked when blocked tasks exist", async () => {
      const content = `### Task Group 1
- [ ] Pending task
- [!] Blocked task`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseShortPlan(checklistPath)
      expect(result[0]?.status).toBe("blocked")
    })

    test("calculates stage status as pending when no tasks started", async () => {
      const content = `### Task Group 1
- [ ] Pending task 1
- [ ] Pending task 2`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseShortPlan(checklistPath)
      expect(result[0]?.status).toBe("pending")
    })
  })

  describe("parseMediumPlan", () => {
    test("returns empty array when INDEX.md does not exist", () => {
      const result = parseMediumPlan(checklistPath)
      expect(result).toEqual([])
    })

    test("parses medium plan with inline stages", async () => {
      const content = `# Plan Checklist

| Stage | Title | Status |
|-------|-------|--------|
| 1 | Setup | \`in_progress\` |
| 2 | Implementation | \`pending\` |

## Stage 1

### Task Group 1
- [x] Setup project
- [~] Configure build

## Stage 2

### Task Group 1
- [ ] Implement feature`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseMediumPlan(checklistPath)
      expect(result).toHaveLength(2)
      expect(result[0]?.number).toBe(1)
      expect(result[0]?.title).toBe("Setup")
      expect(result[0]?.status).toBe("in_progress")
      expect(result[0]?.tasks).toHaveLength(2)
      expect(result[1]?.number).toBe(2)
      expect(result[1]?.title).toBe("Implementation")
      expect(result[1]?.status).toBe("pending")
      expect(result[1]?.tasks).toHaveLength(1)
    })

    test("parses task IDs with stage number prefix", async () => {
      const content = `# Plan

| Stage | Title | Status |
|-------|-------|--------|
| 1 | Stage One | \`pending\` |

## Stage 1

### Task Group 1
- [ ] First task
- [ ] Second task`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseMediumPlan(checklistPath)
      expect(result[0]?.tasks[0]?.id).toBe("1.1.1")
      expect(result[0]?.tasks[1]?.id).toBe("1.1.2")
    })

    test("handles stage status parsing", async () => {
      const content = `# Plan

| Stage | Title | Status |
|-------|-------|--------|
| 1 | Done | \`complete\` |
| 2 | Working | \`in_progress\` |
| 3 | Stuck | \`blocked\` |
| 4 | Waiting | \`pending\` |

## Stage 1

### Task Group 1
- [x] Task

## Stage 2

### Task Group 1
- [~] Task

## Stage 3

### Task Group 1
- [!] Task

## Stage 4

### Task Group 1
- [ ] Task`

      await writeFile(join(checklistPath, "INDEX.md"), content)

      const result = parseMediumPlan(checklistPath)
      expect(result[0]?.status).toBe("complete")
      expect(result[1]?.status).toBe("in_progress")
      expect(result[2]?.status).toBe("blocked")
      expect(result[3]?.status).toBe("pending")
    })
  })

  describe("parseLongPlan", () => {
    test("returns empty array when INDEX.md does not exist", () => {
      const result = parseLongPlan(checklistPath)
      expect(result).toEqual([])
    })

    test("parses long plan with separate stage files", async () => {
      const indexContent = `# Plan Index

| Stage | File | Title | Status |
|-------|------|-------|--------|
| 1 | STAGE_1.md | Setup | \`complete\` |
| 2 | STAGE_2.md | Implementation | \`in_progress\` |`

      const stage1Content = `# Stage 1: Setup

### Task Group 1
- [x] Initialize project
- [x] Configure dependencies`

      const stage2Content = `# Stage 2: Implementation

### Task Group 1
- [x] First feature
- [~] Second feature
- [ ] Third feature`

      await writeFile(join(checklistPath, "INDEX.md"), indexContent)
      await writeFile(join(checklistPath, "STAGE_1.md"), stage1Content)
      await writeFile(join(checklistPath, "STAGE_2.md"), stage2Content)

      const result = parseLongPlan(checklistPath)
      expect(result).toHaveLength(2)
      expect(result[0]?.number).toBe(1)
      expect(result[0]?.title).toBe("Setup")
      expect(result[0]?.status).toBe("complete")
      expect(result[0]?.file).toBe("STAGE_1.md")
      expect(result[0]?.tasks).toHaveLength(2)
      expect(result[1]?.number).toBe(2)
      expect(result[1]?.title).toBe("Implementation")
      expect(result[1]?.status).toBe("in_progress")
      expect(result[1]?.file).toBe("STAGE_2.md")
      expect(result[1]?.tasks).toHaveLength(3)
    })

    test("handles missing stage file gracefully", async () => {
      const indexContent = `# Plan Index

| Stage | File | Title | Status |
|-------|------|-------|--------|
| 1 | STAGE_1.md | Setup | \`pending\` |`

      await writeFile(join(checklistPath, "INDEX.md"), indexContent)
      // Don't create STAGE_1.md

      const result = parseLongPlan(checklistPath)
      expect(result).toHaveLength(1)
      expect(result[0]?.tasks).toHaveLength(0)
    })
  })
})

describe("getPlanProgress", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-progress-test-"))
    await mkdir(join(tempDir, "docs", "plans", "001-test-plan", "checklist"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

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

  test("calculates progress for short plan", async () => {
    const content = `### Task Group 1
- [x] Done task
- [~] In progress task
- [!] Blocked task
- [ ] Pending task`

    await writeFile(
      join(tempDir, "docs", "plans", "001-test-plan", "checklist", "INDEX.md"),
      content
    )

    const result = getPlanProgress(tempDir, { ...basePlan, size: "short" })

    expect(result.planId).toBe("001-test-plan")
    expect(result.planName).toBe("test-plan")
    expect(result.size).toBe("short")
    expect(result.totalTasks).toBe(4)
    expect(result.completedTasks).toBe(1)
    expect(result.inProgressTasks).toBe(1)
    expect(result.blockedTasks).toBe(1)
    expect(result.pendingTasks).toBe(1)
    expect(result.percentComplete).toBe(25)
  })

  test("calculates progress for medium plan", async () => {
    const content = `# Plan

| Stage | Title | Status |
|-------|-------|--------|
| 1 | Stage 1 | \`in_progress\` |

## Stage 1

### Task Group 1
- [x] Task 1
- [x] Task 2
- [ ] Task 3`

    await writeFile(
      join(tempDir, "docs", "plans", "001-test-plan", "checklist", "INDEX.md"),
      content
    )

    const result = getPlanProgress(tempDir, { ...basePlan, size: "medium" })

    expect(result.totalTasks).toBe(3)
    expect(result.completedTasks).toBe(2)
    expect(result.percentComplete).toBe(67)
  })

  test("calculates progress for long plan", async () => {
    const indexContent = `# Plan Index

| Stage | File | Title | Status |
|-------|------|-------|--------|
| 1 | STAGE_1.md | Stage 1 | \`complete\` |`

    const stage1Content = `### Task Group 1
- [x] Task 1
- [x] Task 2`

    await writeFile(
      join(tempDir, "docs", "plans", "001-test-plan", "checklist", "INDEX.md"),
      indexContent
    )
    await writeFile(
      join(tempDir, "docs", "plans", "001-test-plan", "checklist", "STAGE_1.md"),
      stage1Content
    )

    const result = getPlanProgress(tempDir, { ...basePlan, size: "long" })

    expect(result.totalTasks).toBe(2)
    expect(result.completedTasks).toBe(2)
    expect(result.percentComplete).toBe(100)
  })

  test("returns 0 percent for empty plan", async () => {
    const content = `# Empty Plan`

    await writeFile(
      join(tempDir, "docs", "plans", "001-test-plan", "checklist", "INDEX.md"),
      content
    )

    const result = getPlanProgress(tempDir, { ...basePlan, size: "short" })

    expect(result.totalTasks).toBe(0)
    expect(result.percentComplete).toBe(0)
  })

  test("handles unknown plan size", async () => {
    const content = `### Task Group 1
- [ ] Task`

    await writeFile(
      join(tempDir, "docs", "plans", "001-test-plan", "checklist", "INDEX.md"),
      content
    )

    const result = getPlanProgress(tempDir, { ...basePlan, size: "unknown" as any })

    expect(result.stages).toHaveLength(0)
    expect(result.totalTasks).toBe(0)
  })
})

describe("formatProgress", () => {
  test("formats progress with all status types", () => {
    const progress: PlanProgress = {
      planId: "001-test-plan",
      planName: "test-plan",
      size: "medium",
      stages: [
        {
          number: 1,
          title: "Setup",
          status: "complete",
          tasks: [
            { id: "1.1.1", description: "Task", status: "completed", taskGroupNumber: 1, subtaskNumber: 1, lineNumber: 1 },
          ],
          file: "INDEX.md",
        },
        {
          number: 2,
          title: "Implementation",
          status: "in_progress",
          tasks: [
            { id: "2.1.1", description: "Task", status: "in_progress", taskGroupNumber: 1, subtaskNumber: 1, lineNumber: 1 },
          ],
          file: "INDEX.md",
        },
        {
          number: 3,
          title: "Testing",
          status: "blocked",
          tasks: [
            { id: "3.1.1", description: "Task", status: "blocked", taskGroupNumber: 1, subtaskNumber: 1, lineNumber: 1 },
          ],
          file: "INDEX.md",
        },
        {
          number: 4,
          title: "Deploy",
          status: "pending",
          tasks: [
            { id: "4.1.1", description: "Task", status: "pending", taskGroupNumber: 1, subtaskNumber: 1, lineNumber: 1 },
          ],
          file: "INDEX.md",
        },
      ],
      totalTasks: 4,
      completedTasks: 1,
      inProgressTasks: 1,
      blockedTasks: 1,
      pendingTasks: 1,
      percentComplete: 25,
    }

    const output = formatProgress(progress)

    expect(output).toContain("001-test-plan")
    expect(output).toContain("25%")
    expect(output).toContain("[x] Stage 1: Setup")
    expect(output).toContain("[~] Stage 2: Implementation")
    expect(output).toContain("[!] Stage 3: Testing")
    expect(output).toContain("[ ] Stage 4: Deploy")
  })

  test("shows progress bar", () => {
    const progress: PlanProgress = {
      planId: "001-plan",
      planName: "plan",
      size: "short",
      stages: [],
      totalTasks: 10,
      completedTasks: 5,
      inProgressTasks: 0,
      blockedTasks: 0,
      pendingTasks: 5,
      percentComplete: 50,
    }

    const output = formatProgress(progress)

    expect(output).toContain("Progress:")
    expect(output).toContain("50%")
    expect(output).toContain("#")
    expect(output).toContain(".")
  })

  test("shows task counts", () => {
    const progress: PlanProgress = {
      planId: "001-plan",
      planName: "plan",
      size: "short",
      stages: [],
      totalTasks: 10,
      completedTasks: 3,
      inProgressTasks: 2,
      blockedTasks: 1,
      pendingTasks: 4,
      percentComplete: 30,
    }

    const output = formatProgress(progress)

    expect(output).toContain("3/10 complete")
    expect(output).toContain("2 in-progress")
    expect(output).toContain("1 blocked")
  })

  test("uses default stage title when not provided", () => {
    const progress: PlanProgress = {
      planId: "001-plan",
      planName: "plan",
      size: "short",
      stages: [
        {
          number: 1,
          title: "",
          status: "pending",
          tasks: [],
          file: "INDEX.md",
        },
      ],
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      pendingTasks: 0,
      percentComplete: 0,
    }

    const output = formatProgress(progress)

    expect(output).toContain("Stage 1")
  })
})
