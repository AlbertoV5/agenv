import { describe, test, expect } from "bun:test"
import {
  generateTasksMdFromPlan,
  generateTasksMdFromTasks,
  parseTasksMd,
} from "../src/lib/tasks-md"
import type {
  Task,
  StreamDocument,
  StageDefinition,
  BatchDefinition,
  ThreadDefinition,
} from "../src/lib/types"

describe("tasks-md", () => {
  const mockStreamDoc: StreamDocument = {
    streamName: "Test Stream",
    summary: "Summary",
    references: [],
    stages: [
      {
        id: 1,
        name: "Stage One",
        definition: "",
        constitution: { requirements: [], inputs: [], outputs: [], flows: [] },
        questions: [],
        batches: [
          {
            id: 1,
            prefix: "01",
            name: "Setup",
            summary: "",
            threads: [
              { id: 1, name: "Thread One", summary: "", details: "" },
              { id: 2, name: "Thread Two", summary: "", details: "" },
            ],
          },
        ],
      },
    ],
  }

  test("generateTasksMdFromPlan creates correct structure", () => {
    const md = generateTasksMdFromPlan("Test Stream", mockStreamDoc)

    expect(md).toContain("# Tasks: Test Stream")
    expect(md).toContain("## Stage 01: Stage One")
    expect(md).toContain("### Batch 01: Setup")
    expect(md).toContain("#### Thread 01: Thread One")
    expect(md).toContain("- [ ] Task 01.01.01.01: ")
    expect(md).toContain("#### Thread 02: Thread Two")
    expect(md).toContain("- [ ] Task 01.01.02.01: ")
  })

  test("parseTasksMd extracts tasks correctly", () => {
    const md = `
# Tasks: Test Stream

## Stage 01: Stage One

### Batch 01: Setup

#### Thread 01: Thread One
- [ ] Task 01.01.01.01: First task
- [x] Task 01.01.01.02: Second task (completed)

#### Thread 02: Thread Two
- [~] Task 01.01.02.01: Third task (in progress)
`
    const { tasks, errors } = parseTasksMd(md, "stream-id")

    expect(errors).toHaveLength(0)
    expect(tasks).toHaveLength(3)

    expect(tasks[0]).toMatchObject({
      id: "01.01.01.01",
      name: "First task",
      status: "pending",
      stage_name: "Stage One",
      batch_name: "Setup",
      thread_name: "Thread One",
    })

    expect(tasks[1]).toMatchObject({
      id: "01.01.01.02",
      name: "Second task (completed)",
      status: "completed",
    })

    expect(tasks[2]).toMatchObject({
      id: "01.01.02.01",
      name: "Third task (in progress)",
      status: "in_progress",
    })
  })

  test("parseTasksMd validates hierarchy", () => {
    const md = `
# Tasks: Test Stream

## Stage 01: Stage One
### Batch 01: Setup
#### Thread 01: Thread One
- [ ] Task 02.01.01.01: Wrong stage ID
`
    const { tasks, errors } = parseTasksMd(md, "stream-id")

    expect(tasks).toHaveLength(0)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("Task ID 02.01.01.01 does not match hierarchy")
  })

  test("generateTasksMdFromTasks regenerates markdown", () => {
    const tasks: Task[] = [
      {
        id: "01.01.01.01",
        name: "First task",
        status: "pending",
        stage_name: "Stage One",
        batch_name: "Setup",
        thread_name: "Thread One",
        created_at: "",
        updated_at: "",
      },
      {
        id: "01.01.02.01",
        name: "Second task",
        status: "completed",
        stage_name: "Stage One",
        batch_name: "Setup",
        thread_name: "Thread Two",
        created_at: "",
        updated_at: "",
      },
    ]

    const md = generateTasksMdFromTasks("Test Stream", tasks)

    expect(md).toContain("## Stage 01: Stage One")
    expect(md).toContain("### Batch 01: Setup")
    expect(md).toContain("#### Thread 01: Thread One")
    expect(md).toContain("- [ ] Task 01.01.01.01: First task")
    expect(md).toContain("#### Thread 02: Thread Two")
    expect(md).toContain("- [x] Task 01.01.02.01: Second task")
  })
})
