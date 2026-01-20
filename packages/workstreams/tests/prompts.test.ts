import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseThreadId,
  formatThreadId,
  parseTestsMd,
  getTestRequirements,
  getPromptContext,
  generateThreadPrompt,
  generateThreadPromptJson,
} from "../src/lib/prompts"
import type { TasksFile, WorkIndex, AgentsConfig } from "../src/lib/types"

describe("parseThreadId", () => {
  test("parses valid thread ID", () => {
    const result = parseThreadId("01.01.02")
    expect(result).toEqual({ stage: 1, batch: 1, thread: 2 })
  })

  test("parses thread ID with larger numbers", () => {
    const result = parseThreadId("05.03.10")
    expect(result).toEqual({ stage: 5, batch: 3, thread: 10 })
  })

  test("returns null for invalid format - too few parts", () => {
    expect(parseThreadId("01.00")).toBeNull()
  })

  test("returns null for invalid format - too many parts", () => {
    expect(parseThreadId("01.01.02.03")).toBeNull()
  })

  test("returns null for non-numeric parts", () => {
    expect(parseThreadId("01.abc.02")).toBeNull()
  })

  test("returns null for empty string", () => {
    expect(parseThreadId("")).toBeNull()
  })
})

describe("formatThreadId", () => {
  test("formats thread ID with zero-padding", () => {
    expect(formatThreadId(1, 1, 2)).toBe("01.01.02")
  })

  test("formats thread ID with larger numbers", () => {
    expect(formatThreadId(12, 5, 99)).toBe("12.05.99")
  })

  test("handles single digit numbers", () => {
    expect(formatThreadId(1, 1, 1)).toBe("01.01.01")
  })
})

describe("parseTestsMd", () => {
  test("parses general section", () => {
    const content = `
# Test Requirements

## General
- Test command: \`bun test\`
- Type check: \`bun tsc --noEmit\`
`
    const result = parseTestsMd(content)
    expect(result.general).toHaveLength(2)
    expect(result.general[0]).toContain("bun test")
    expect(result.perStage).toHaveLength(0)
  })

  test("parses per-stage section", () => {
    const content = `
# Test Requirements

## Per-Stage Tests
- [ ] Unit tests: \`bun test src/lib/\`
- [ ] Integration: \`bun test:integration\`
`
    const result = parseTestsMd(content)
    expect(result.perStage).toHaveLength(2)
    expect(result.general).toHaveLength(0)
  })

  test("parses both sections", () => {
    const content = `
# Test Requirements

## General
- Test command: \`bun test\`

## Per-Stage Tests
- Unit tests: \`bun test src/lib/\`
`
    const result = parseTestsMd(content)
    expect(result.general).toHaveLength(1)
    expect(result.perStage).toHaveLength(1)
  })

  test("handles empty content", () => {
    const result = parseTestsMd("")
    expect(result.general).toHaveLength(0)
    expect(result.perStage).toHaveLength(0)
  })
})

describe("getTestRequirements", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-prompts-test-"))
    await mkdir(join(tempDir, "work"), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("returns null if TESTS.md does not exist", () => {
    const result = getTestRequirements(tempDir)
    expect(result).toBeNull()
  })

  test("returns parsed requirements if TESTS.md exists", async () => {
    await writeFile(
      join(tempDir, "work", "TESTS.md"),
      `# Test Requirements\n\n## General\n- Test: \`bun test\``,
    )

    const result = getTestRequirements(tempDir)
    expect(result).not.toBeNull()
    expect(result!.general).toHaveLength(1)
  })
})

describe("getPromptContext", () => {
  let tempDir: string
  const streamId = "001-test-stream"

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agenv-prompts-ctx-"))
    await mkdir(join(tempDir, "work", streamId), { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  test("throws on invalid thread ID format", () => {
    expect(() => getPromptContext(tempDir, streamId, "invalid")).toThrow(
      "Invalid thread ID format",
    )
  })

  test("throws if PLAN.md not found", () => {
    expect(() => getPromptContext(tempDir, streamId, "01.01.01")).toThrow(
      "PLAN.md not found",
    )
  })

  test("throws if stage not found", async () => {
    const planContent = `# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 01: Setup

#### Stage Definition
Setup definition

#### Stage Constitution
- Structure 1

#### Stage Batches

##### Batch 01: Init

###### Thread 01: Backend
**Summary:**

Backend setup

**Details:**

Details here
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    expect(() => getPromptContext(tempDir, streamId, "02.01.01")).toThrow(
      "Stage 2 not found",
    )
  })

  test("throws if batch not found", async () => {
    const planContent = `# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 01: Setup

#### Stage Definition
Setup definition

#### Stage Constitution
- Structure 1

#### Stage Batches

##### Batch 01: Init

###### Thread 01: Backend
**Summary:**

Backend setup

**Details:**

Details here
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    expect(() => getPromptContext(tempDir, streamId, "01.05.01")).toThrow(
      "Batch 5 not found",
    )
  })

  test("throws if thread not found", async () => {
    const planContent = `# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 01: Setup

#### Stage Definition
Setup definition

#### Stage Constitution
- Structure 1

#### Stage Batches

##### Batch 01: Init

###### Thread 01: Backend
**Summary:**

Backend setup

**Details:**

Details here
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    expect(() => getPromptContext(tempDir, streamId, "01.01.05")).toThrow(
      "Thread 5 not found",
    )
  })

  test("returns full context for valid thread", async () => {
    const planContent = `# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 01: Setup

#### Stage Definition
Setup the project structure

#### Stage Constitution
**Structure:**
- Project structure created

**Inputs:**
- Design docs

**Outputs:**
- Directory structure

#### Stage Batches

##### Batch 01: Init

###### Thread 01: Backend
**Summary:**

Backend setup

**Details:**

Create backend structure

###### Thread 02: Frontend
**Summary:**

Frontend setup

**Details:**

Create frontend structure
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: streamId,
      last_updated: new Date().toISOString(),
      tasks: [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Backend",
          batch_name: "Init",
          stage_name: "Setup",
          created_at: "",
          updated_at: "",
          status: "pending",
        },
        {
          id: "01.01.01.02",
          name: "Task 2",
          thread_name: "Backend",
          batch_name: "Init",
          stage_name: "Setup",
          created_at: "",
          updated_at: "",
          status: "pending",
        },
        {
          id: "01.01.02.01",
          name: "Frontend Task",
          thread_name: "Frontend",
          batch_name: "Init",
          stage_name: "Setup",
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

    const ctx = getPromptContext(tempDir, streamId, "01.01.01")

    expect(ctx.streamId).toBe(streamId)
    expect(ctx.streamName).toBe("Test Stream")
    expect(ctx.threadId).toEqual({ stage: 1, batch: 1, thread: 1 })
    expect(ctx.thread.name).toBe("Backend")
    expect(ctx.thread.summary).toBe("Backend setup")
    expect(ctx.stage.name).toBe("Setup")
    expect(ctx.batch.name).toBe("Init")
    expect(ctx.tasks).toHaveLength(2) // Only backend tasks
    expect(ctx.parallelThreads).toHaveLength(1) // Frontend
    expect(ctx.parallelThreads[0]!.name).toBe("Frontend")
  })

  test("includes agent assignment if available", async () => {
    const planContent = `# Plan: Test Stream

## Summary
Test summary

## Stages

### Stage 01: Setup

#### Stage Definition
Setup

#### Stage Constitution
- Req

#### Stage Batches

##### Batch 01: Init

###### Thread 01: Backend
**Summary:**

Backend

**Details:**

Details
`
    await writeFile(join(tempDir, "work", streamId, "PLAN.md"), planContent)

    const tasksFile: TasksFile = {
      version: "1.0.0",
      stream_id: streamId,
      last_updated: new Date().toISOString(),
      tasks: [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Backend",
          batch_name: "Init",
          stage_name: "Setup",
          created_at: "",
          updated_at: "",
          status: "pending",
          assigned_agent: "claude-opus",
        },
      ],
    }
    await writeFile(
      join(tempDir, "work", streamId, "tasks.json"),
      JSON.stringify(tasksFile, null, 2),
    )

    // Create AGENTS.md
    const agentsContent = `# Agents

## Agent Definitions

### claude-opus
**Description:** Full codebase expert
**Best for:** Complex tasks
**Model:** claude-opus-4
`
    await writeFile(join(tempDir, "work", "AGENTS.md"), agentsContent)

    const ctx = getPromptContext(tempDir, streamId, "01.01.01")

    expect(ctx.assignedAgent).toBeDefined()
    expect(ctx.assignedAgent!.name).toBe("claude-opus")
    expect(ctx.assignedAgent!.model).toBe("claude-opus-4")
  })
})

describe("generateThreadPrompt", () => {
  test("generates markdown prompt with all sections", () => {
    const context = {
      threadId: { stage: 1, batch: 0, thread: 1 },
      threadIdString: "01.01.01",
      streamId: "001-test",
      streamName: "Test Stream",
      thread: {
        id: 1,
        name: "Backend",
        summary: "Backend setup",
        details: "Create backend structure",
      },
      stage: {
        id: 1,
        name: "Setup",
        definition: "Setup the project",
        constitution: "Test constitution",
        questions: [],
        batches: [],
      },
      batch: {
        id: 0,
        prefix: "00",
        name: "Init",
        summary: "Initial setup",
        threads: [],
      },
      tasks: [
        {
          id: "01.01.01.01",
          name: "Task 1",
          thread_name: "Backend",
          batch_name: "Init",
          stage_name: "Setup",
          created_at: "",
          updated_at: "",
          status: "pending" as const,
        },
      ],
      parallelThreads: [
        { id: 2, name: "Frontend", summary: "Frontend setup", details: "" },
      ],
      assignedAgent: {
        name: "claude-opus",
        description: "Expert",
        bestFor: "Complex tasks",
        model: "claude-opus-4",
      },
      testRequirements: {
        general: ["bun test"],
        perStage: ["Unit tests"],
      },
      outputDir: "work/001-test/files/stage-1/00-init/backend",
    }

    const prompt = generateThreadPrompt(context)

    expect(prompt).toContain("# Thread Execution: Backend")
    expect(prompt).toContain("Test Stream")
    expect(prompt).toContain("claude-opus")
    expect(prompt).toContain("Test constitution")
    expect(prompt).toContain("Backend setup")
    expect(prompt).toContain("Task 1")
    expect(prompt).toContain("Frontend")
    expect(prompt).toContain("bun test")
    expect(prompt).toContain("work/001-test/files/stage-1/00-init/backend")
  })

  test("excludes test section when includeTests is false", () => {
    const context = {
      threadId: { stage: 1, batch: 0, thread: 1 },
      threadIdString: "01.01.01",
      streamId: "001-test",
      streamName: "Test",
      thread: { id: 1, name: "Backend", summary: "", details: "" },
      stage: {
        id: 1,
        name: "Setup",
        definition: "",
        constitution: "",
        questions: [],
        batches: [],
      },
      batch: { id: 0, prefix: "00", name: "Init", summary: "", threads: [] },
      tasks: [],
      parallelThreads: [],
      testRequirements: { general: ["bun test"], perStage: [] },
      outputDir: "work/001-test/files/stage-1/00-init/backend",
    }

    const prompt = generateThreadPrompt(context, { includeTests: false })

    expect(prompt).not.toContain("Test Requirements")
    expect(prompt).not.toContain("bun test")
  })

  test("excludes parallel section when includeParallel is false", () => {
    const context = {
      threadId: { stage: 1, batch: 0, thread: 1 },
      threadIdString: "01.01.01",
      streamId: "001-test",
      streamName: "Test",
      thread: { id: 1, name: "Backend", summary: "", details: "" },
      stage: {
        id: 1,
        name: "Setup",
        definition: "",
        constitution: "",
        questions: [],
        batches: [],
      },
      batch: { id: 0, prefix: "00", name: "Init", summary: "", threads: [] },
      tasks: [],
      parallelThreads: [
        { id: 2, name: "Frontend", summary: "Frontend", details: "" },
      ],
      outputDir: "work/001-test/files/stage-1/00-init/backend",
    }

    const prompt = generateThreadPrompt(context, { includeParallel: false })

    expect(prompt).not.toContain("Parallel Threads")
    expect(prompt).not.toContain("Frontend")
  })
})

describe("generateThreadPromptJson", () => {
  test("generates JSON with all context", () => {
    const context = {
      threadId: { stage: 1, batch: 0, thread: 1 },
      threadIdString: "01.01.01",
      streamId: "001-test",
      streamName: "Test Stream",
      thread: {
        id: 1,
        name: "Backend",
        summary: "Summary",
        details: "Details",
      },
      stage: {
        id: 1,
        name: "Setup",
        definition: "Definition",
        constitution: "",
        questions: [],
        batches: [],
      },
      batch: { id: 0, prefix: "00", name: "Init", summary: "", threads: [] },
      tasks: [
        {
          id: "01.01.01.01",
          name: "Task",
          thread_name: "Backend",
          batch_name: "Init",
          stage_name: "Setup",
          created_at: "",
          updated_at: "",
          status: "pending" as const,
          breadcrumb: "Started",
        },
      ],
      parallelThreads: [],
      assignedAgent: {
        name: "claude",
        description: "Desc",
        bestFor: "Tasks",
        model: "opus",
      },
      testRequirements: { general: ["test"], perStage: [] },
      outputDir: "work/001-test/files/stage-1/00-init/backend",
    }

    const json = generateThreadPromptJson(context) as any

    expect(json.threadId).toBe("01.01.01")
    expect(json.stream.id).toBe("001-test")
    expect(json.stream.name).toBe("Test Stream")
    expect(json.location.stage.id).toBe(1)
    expect(json.location.batch.prefix).toBe("00")
    expect(json.tasks).toHaveLength(1)
    expect(json.tasks[0].breadcrumb).toBe("Started")
    expect(json.assignedAgent.name).toBe("claude")
    expect(json.testRequirements.general).toContain("test")
  })

  test("handles null agent and test requirements", () => {
    const context = {
      threadId: { stage: 1, batch: 0, thread: 1 },
      threadIdString: "01.01.01",
      streamId: "001-test",
      streamName: "Test",
      thread: { id: 1, name: "Backend", summary: "", details: "" },
      stage: {
        id: 1,
        name: "Setup",
        definition: "",
        constitution: "",
        questions: [],
        batches: [],
      },
      batch: { id: 0, prefix: "00", name: "Init", summary: "", threads: [] },
      tasks: [],
      parallelThreads: [],
      outputDir: "work/001-test/files/stage-1/00-init/backend",
    }

    const json = generateThreadPromptJson(context) as any

    expect(json.assignedAgent).toBeNull()
    expect(json.testRequirements).toBeNull()
  })
})
