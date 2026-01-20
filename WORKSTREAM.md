# The Workstream Framework: Specification

## Core Terminology

The framework uses specific nouns to define the scale and relationship of work units:

- **Workstream**: A coherent, structured body of work within a repository (e.g., "Implement Authentication" or "API Migration").

- **Stage**: A major subdivision of a workstream. Each stage should be testable and result in a contained state of the system.

- **Batch**: A group of threads within a stage that must be executed in a specific sequence (e.g., 00-setup, 01-implementation).

- **Thread**: A unit of work within a batch designed for parallelism. Threads are the primary surface area for AI agents to work independently without high dependency overhead.

- **Task**: The most granular action item defined within a thread.

## Structural Hierarchy

| Level | Execution Logic | Description |
| :--- | :--- | :--- |
| Stage | Serial | Large checkpoints; usually ends with an evaluation gate. |
| Batch | Serial | Numeric-prefixed groups (e.g., 00, 01) to ensure order of operations. |
| Thread | Parallel | Parallel execution units (e.g., frontend, backend, mobile). |
| Task | Hybrid | Granular steps within a thread. |

## File System Structure

Workstreams live at the repository root in the `work/` directory:

```
work/
├── index.json                   # Global registry of all workstreams
├── AGENTS.md                    # Agent definitions (shared across workstreams)
├── TESTS.md                     # Test requirements (shared across workstreams)
└── {stream-id}/
    ├── PLAN.md                  # Human-readable intent (required)
    ├── TASKS.md                 # Intermediate task file (temporary)
    ├── tasks.json               # Machine-readable state (generated)
    ├── COMPLETION.md            # Final completion summary (generated at end)
    └── files/                   # Output directory
        └── stage-{N}/
            └── {batch-prefix}-{batch-name}/
                └── {thread-name}/
                    └── {descriptive-name}.md
```

## Workflow Lifecycle: 3-Phase Model

Every workstream follows a three-phase progression to separate planning, execution, and documentation.

### Phase 1: Setup Workstream

#### 1.1 Planning

The Planner agent discusses requirements with the user before creating the plan:

- Ask clarifying questions about scope, constraints, and goals
- Identify dependencies and potential risks
- Create initial PLAN.md with stages, batches, and threads
- Use a question-driven approach to resolve unknowns

#### 1.2 Review

A Reviewer agent (or human) analyzes the PLAN.md:

- Identifies weaknesses, missing considerations, or risks
- Checks for proper stage/batch/thread breakdown
- Provides structured feedback for revision
- Iteration continues until plan is solid

#### 1.3 Approval Gate (HITL)

Human-in-the-loop approval before execution:

- User reviews final PLAN.md
- `work approve` command stores SHA-256 hash of PLAN.md
- If PLAN.md is modified after approval, approval is auto-revoked
- Approval gates task creation

#### 1.4 Task Serialization

After approval, tasks are created from the plan:

- `work tasks generate` creates TASKS.md as human-readable intermediate
- User reviews TASKS.md for accuracy
- `work tasks serialize` converts TASKS.md to tasks.json
- TASKS.md is auto-deleted after serialization (tasks.json is source of truth)

#### 1.5 Agent Assignment

For each batch, agents are assigned to threads:

- `work/AGENTS.md` defines available agents and their capabilities (shared across all workstreams)
- User assigns agents to threads for the upcoming batch
- Assignments are stored in tasks.json

### Phase 2: Execute Workstream

#### 2.1 Prompt Generation

The Planner agent creates execution prompts for each thread:

- Thread summary and details from PLAN.md
- Tasks assigned to the thread
- Stage definition context
- List of parallel threads (for awareness)
- `work/TESTS.md` requirements if present
- Agent assignment information

#### 2.2 Agent Execution

Agents execute their assigned threads:

- Reference PLAN.md for context and approach
- Create descriptive documentation in `./files/{stage}/{batch}/{thread}/{name}.md`
- If `work/TESTS.md` exists, run tests and make corrections
- Log breadcrumbs for recovery if interrupted

#### 2.3 Batch Iteration

Work progresses batch by batch:

- Complete all threads in a batch before starting the next batch
- User performs testing at stage boundaries
- If issues are found, create fix batches (see 2.4)

#### 2.4 Fix Workflow

When issues are discovered:

- **Fix Batches**: For issues within a stage, append a fix batch (e.g., `02-fix-validation`)
- **Fix Stages**: For issues after stage completion, append a fix stage (e.g., `stage-3-fix-auth-race`)
- Planner updates tasks.json and creates fix prompts
- Fix iteration continues until user accepts

### Phase 3: Documentation & References

#### 3.1 Completion Summary

After all stages complete, the Planner creates COMPLETION.md in the workstream directory:

- Key accomplishments
- Insights and learnings
- File references (links to outputs in `files/`)
- Metrics (tasks completed, fix iterations, etc.)

#### 3.2 Documentation Update

A Documentation agent updates project documentation:

- Reads existing docs in `docs/` subdirectories
- Reads COMPLETION.md and relevant `files/*.md` outputs
- Updates documentation with new information
- Maintains consistency with existing style

#### 3.3 Reference Generation

The Documentation agent also updates reference documentation:

- API Reference style documentation
- Generated from code outputs and implementation details
- Stored in appropriate `docs/` subdirectory

## File Format Conventions

### PLAN.md Format

```markdown
# Plan: {Stream Name}

## Summary
Brief overview of the workstream goals.

## References
- Link to relevant docs or prior work

### Stage {N}: {Stage Name}
What this stage accomplishes.

#### Stage Definition
Detailed definition of scope and goals.

#### Constitution
**Requirements:** What must be true when complete
**Inputs:** What this stage needs
**Outputs:** What this stage produces
**Flows:** How data/control flows through

#### Questions
- [ ] Open questions to resolve

##### Batch {NN}: {Batch Name}
What this batch accomplishes.

###### Thread {X}: {Thread Name}
**Summary:** Thread purpose
**Details:** Implementation approach
```

### TASKS.md Format (Temporary)

```markdown
# Tasks: {Stream Name}

## Stage 1: {Name}

### Batch 01: {Name}

#### Thread 1: {Name}
- [ ] Task 01.01.01.01: Description
- [ ] Task 01.01.01.02: Description

#### Thread 2: {Name}
- [ ] Task 01.01.02.01: Description
```

### AGENTS.md Format (at `work/AGENTS.md`)

Shared across all workstreams in the repository:

```markdown
# Agents

## Available Agents
| Agent | Capabilities | Constraints |
|-------|-------------|-------------|
| claude-opus | Full codebase, complex reasoning | Rate limited |
| claude-sonnet | Single file focus, fast | Simpler tasks |

## Batch Assignments
| Stream | Stage.Batch | Thread | Agent | Notes |
|--------|-------------|--------|-------|-------|
| 001-auth | 01.01 | backend | claude-opus | Complex setup |
| 001-auth | 01.01 | frontend | claude-sonnet | Config only |
```

### TESTS.md Format (at `work/TESTS.md`)

Shared test configuration for all workstreams:

```markdown
# Test Requirements

## General
- Test command: `bun test`
- Type check: `bun tsc --noEmit`

## Per-Stage Tests
- [ ] Unit tests: `bun test src/lib/`
- [ ] Integration: `bun test:integration`
- [ ] E2E tests: `bun test:e2e`
```

### COMPLETION.md Format (per workstream)

Generated in the workstream directory upon completion:

```markdown
# Completion: {Stream Name}

## Accomplishments
- Implemented feature X
- Resolved issue Y
- Added documentation for Z

## Key Insights
- Pattern A worked well for B
- Approach C needed adjustment due to D

## File References
| File | Purpose |
|------|---------|
| files/stage-1/00-setup/backend/thread.md | Backend setup notes |
| src/lib/feature.ts | Core implementation |

## Metrics
- Tasks: 24/24 completed
- Stages: 2
- Fix iterations: 1
```

## Agent Roles

| Role | Responsibilities |
|------|-----------------|
| **Planner** | Creates PLAN.md, generates TASKS.md, creates execution prompts, manages fix batches/stages, generates COMPLETION.md |
| **Reviewer** | Reviews PLAN.md for weaknesses, provides structured feedback, optional review after fixes |
| **Executor** | Assigned to specific threads, implements tasks, creates descriptive documentation, runs tests |
| **Documentation** | Reads COMPLETION.md and outputs, updates project docs, generates reference documentation |

## State Management

### Task Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `completed` | Finished successfully |
| `blocked` | Cannot proceed (with reason) |
| `cancelled` | Dropped from scope |

### Breadcrumbs

Agents log their last action in the `breadcrumb` field for recovery:

```
"Finished API routes, starting validation logic"
```

If an agent fails mid-thread, a "continue" command uses breadcrumbs and existing outputs to orient a new agent instance.

## Handling Failure & Iteration

### Recovery

If an agent fails mid-thread:
1. `work continue` displays the last breadcrumb and active task
2. A new agent instance can resume from that point
3. Existing file outputs provide additional context

### Fix Batches

For issues within a stage:
1. Append a fix batch: `work fix --batch --stage N --name "fix-validation"`
2. Creates new batch with threads to address the issue
3. Planner generates fix prompts for assigned agents

### Fix Stages

For issues discovered after stage completion:
1. Append a fix stage: `work fix --stage N --name "fix-auth-race"`
2. Creates new stage with its own batches and threads
3. Uses current codebase state as reference
