import { describe, test, expect } from "bun:test"
import {
  generateTasksMdFromPlan,
  generateTasksMdFromTasks,
  parseTasksMd,
  serializeTasksMd,
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
        constitution: "",
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
  test("preserve report field in round trip", () => {
    const originalTasks: Task[] = [
      {
        id: "01.01.01.01",
        name: "Task with report",
        status: "completed",
        stage_name: "Stage One",
        batch_name: "Batch One",
        thread_name: "Thread One",
        report: "This is a completion report.",
        created_at: "",
        updated_at: "",
      },
    ]

    const md = generateTasksMdFromTasks("Test Stream", originalTasks)
    expect(md).toContain("> Report: This is a completion report.")

    const { tasks } = parseTasksMd(md, "stream-id")
    expect(tasks[0]?.report).toBe("This is a completion report.")
  })

  // Agent assignment tests
  describe("agent assignment support", () => {
    test("generateTasksMdFromPlan includes @agent: placeholder in thread headers", () => {
      const md = generateTasksMdFromPlan("Test Stream", mockStreamDoc)

      expect(md).toContain("#### Thread 01: Thread One @agent:")
      expect(md).toContain("#### Thread 02: Thread Two @agent:")
    })

    test("parseTasksMd extracts agent assignment from thread header", () => {
      const md = `
# Tasks: Test Stream

## Stage 01: Stage One

### Batch 01: Setup

#### Thread 01: Router @agent:backend-expert
- [ ] Task 01.01.01.01: Create route definitions
- [ ] Task 01.01.01.02: Add middleware chain

#### Thread 02: Frontend @agent:frontend-expert
- [ ] Task 01.01.02.01: Build UI component
`
      const { tasks, errors } = parseTasksMd(md, "stream-id")

      expect(errors).toHaveLength(0)
      expect(tasks).toHaveLength(3)

      // All tasks in Thread 01 should have backend-expert
      expect(tasks[0]).toMatchObject({
        id: "01.01.01.01",
        name: "Create route definitions",
        thread_name: "Router",
        assigned_agent: "backend-expert",
      })
      expect(tasks[1]).toMatchObject({
        id: "01.01.01.02",
        name: "Add middleware chain",
        thread_name: "Router",
        assigned_agent: "backend-expert",
      })

      // Thread 02 task should have frontend-expert
      expect(tasks[2]).toMatchObject({
        id: "01.01.02.01",
        name: "Build UI component",
        thread_name: "Frontend",
        assigned_agent: "frontend-expert",
      })
    })

    test("parseTasksMd handles thread without agent assignment", () => {
      const md = `
# Tasks: Test Stream

## Stage 01: Stage One

### Batch 01: Setup

#### Thread 01: Router
- [ ] Task 01.01.01.01: Create route definitions
`
      const { tasks, errors } = parseTasksMd(md, "stream-id")

      expect(errors).toHaveLength(0)
      expect(tasks).toHaveLength(1)
      expect(tasks[0]?.assigned_agent).toBeUndefined()
    })

    test("parseTasksMd handles empty @agent: placeholder", () => {
      const md = `
# Tasks: Test Stream

## Stage 01: Stage One

### Batch 01: Setup

#### Thread 01: Router @agent:
- [ ] Task 01.01.01.01: Create route definitions
`
      const { tasks, errors } = parseTasksMd(md, "stream-id")

      expect(errors).toHaveLength(0)
      expect(tasks).toHaveLength(1)
      expect(tasks[0]?.assigned_agent).toBeUndefined()
    })

    test("generateTasksMdFromTasks includes agent assignments in output", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "First task",
          status: "pending",
          stage_name: "Stage One",
          batch_name: "Setup",
          thread_name: "Router",
          assigned_agent: "backend-expert",
          created_at: "",
          updated_at: "",
        },
        {
          id: "01.01.02.01",
          name: "Second task",
          status: "completed",
          stage_name: "Stage One",
          batch_name: "Setup",
          thread_name: "Frontend",
          assigned_agent: "frontend-expert",
          created_at: "",
          updated_at: "",
        },
      ]

      const md = generateTasksMdFromTasks("Test Stream", tasks)

      expect(md).toContain("#### Thread 01: Router @agent:backend-expert")
      expect(md).toContain("#### Thread 02: Frontend @agent:frontend-expert")
    })

    test("generateTasksMdFromTasks omits @agent: when no assignment", () => {
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "First task",
          status: "pending",
          stage_name: "Stage One",
          batch_name: "Setup",
          thread_name: "Router",
          created_at: "",
          updated_at: "",
        },
      ]

      const md = generateTasksMdFromTasks("Test Stream", tasks)

      expect(md).toContain("#### Thread 01: Router")
      expect(md).not.toContain("@agent:")
    })

    test("serializeTasksMd applies thread agent to tasks", () => {
      const md = `
# Tasks: Test Stream

## Stage 01: Stage One

### Batch 01: Setup

#### Thread 01: Router @agent:backend-expert
- [ ] Task 01.01.01.01: Create route definitions

#### Thread 02: Frontend @agent:frontend-expert
- [ ] Task 01.01.02.01: Build UI component
`
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Create route definitions",
          status: "pending",
          stage_name: "Stage One",
          batch_name: "Setup",
          thread_name: "Router",
          created_at: "",
          updated_at: "",
        },
        {
          id: "01.01.02.01",
          name: "Build UI component",
          status: "pending",
          stage_name: "Stage One",
          batch_name: "Setup",
          thread_name: "Frontend",
          created_at: "",
          updated_at: "",
        },
      ]

      const updatedTasks = serializeTasksMd(md, tasks)

      expect(updatedTasks[0]?.assigned_agent).toBe("backend-expert")
      expect(updatedTasks[1]?.assigned_agent).toBe("frontend-expert")
    })

    test("serializeTasksMd preserves tasks without matching thread", () => {
      const md = `
# Tasks: Test Stream

## Stage 01: Stage One

### Batch 01: Setup

#### Thread 01: Router @agent:backend-expert
- [ ] Task 01.01.01.01: Create route definitions
`
      const tasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Create route definitions",
          status: "pending",
          stage_name: "Stage One",
          batch_name: "Setup",
          thread_name: "Router",
          created_at: "",
          updated_at: "",
        },
        {
          id: "02.01.01.01",
          name: "Different stage task",
          status: "pending",
          stage_name: "Stage Two",
          batch_name: "Setup",
          thread_name: "Other",
          created_at: "",
          updated_at: "",
        },
      ]

      const updatedTasks = serializeTasksMd(md, tasks)

      expect(updatedTasks[0]?.assigned_agent).toBe("backend-expert")
      expect(updatedTasks[1]?.assigned_agent).toBeUndefined()
    })

    test("round trip preserves agent assignments", () => {
      const originalTasks: Task[] = [
        {
          id: "01.01.01.01",
          name: "Task with agent",
          status: "completed",
          stage_name: "Stage One",
          batch_name: "Batch One",
          thread_name: "Thread One",
          assigned_agent: "test-agent",
          created_at: "",
          updated_at: "",
        },
      ]

      const md = generateTasksMdFromTasks("Test Stream", originalTasks)
      expect(md).toContain("@agent:test-agent")

      const { tasks } = parseTasksMd(md, "stream-id")
      expect(tasks[0]?.assigned_agent).toBe("test-agent")
    })
  })
})
