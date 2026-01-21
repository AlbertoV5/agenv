# The Workstream Framework: Specification

## Core Terminology

The framework uses specific nouns to define the scale and relationship of work units:

- **Workstream**: A coherent, structured body of work within a repository (e.g., "Implement Authentication" or "API Migration").

- **Stage**: A major subdivision of a workstream. Each stage should be testable and result in a contained state of the system.

- **Batch**: A group of threads within a stage that must be executed in a specific sequence (e.g., 01-setup, 02-implementation).

- **Thread**: A unit of work within a batch designed for parallelism. Threads are the primary surface area for AI agents to work independently without high dependency overhead.

- **Task**: The most granular action item defined within a thread. Each thread contains as many task as required.

## Structural Hierarchy

| Level | Execution Logic | Numbering | Description |
| :--- | :--- | :--- | :--- |
| Stage | Serial | 01, 02, 03... | Large checkpoints; usually ends with an evaluation gate. |
| Batch | Serial | 01, 02, 03... | Numeric-prefixed groups to ensure order of operations. |
| Thread | Parallel | 01, 02, 03... | Parallel execution units (e.g., frontend, backend, mobile). |
| Task | Hybrid | 01.01.01.01 | Granular steps within a thread. Format: stage.batch.thread.task |

**All numbering is 1-indexed and zero-padded to 2 digits.**

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
    ├── COMPLETION.md            # Final completion summary (generated at end)
    ├── prompts/                 # Generated prompt files
    │   └── {stage-prefix}-{stage-name}/
    │       └── {batch-prefix}-{batch-name}/
    │           └── {thread-name}.md
    └── files/                   # Output directory
        └── stage-{N}/
            └── {batch-prefix}-{batch-name}/
                └── {thread-name}/
                    └── {descriptive-name}.md
```

---

## Skills System

Skills provide instructions for AI agents at different phases of workstream management. Each skill is a focused guide for a specific role.

### Available Skills

| Skill | Purpose | Agent Role |
|-------|---------|------------|
| `create-workstream-plans` | Create new workstreams with PLAN.md | Planner |
| `reviewing-workstream-plans` | Validate and approve plans | Reviewer |
| `implementing-workstream-plans` | Execute tasks within threads | Executor |
| `generating-workstream-prompts` | Generate context for execution | Planner |

### Skill Locations

Skills are stored in the repository at `skills/{skill-name}/SKILL.md`.

### Skill Invocation

When an agent needs to perform a workstream operation, it should reference the appropriate skill:

```
/create-workstream-plans    # Planning agent creating a new workstream
/reviewing-workstream-plans # Reviewer validating a plan
/implementing-workstream-plans # Executor working on tasks
/generating-workstream-prompts # Generating execution context
```

---

## Workflow Lifecycle: 3-Phase Model

Every workstream follows a three-phase progression to separate planning, execution, and documentation.

### Phase 1: Setup Workstream

**Skill:** `create-workstream-plans`

#### 1.1 Planning

The Planner agent discusses requirements with the user before creating the plan:

- Ask clarifying questions about scope, constraints, and goals
- Identify dependencies and potential risks
- Create workstream: `work create --name "feature-name" --stages N`
- Fill out PLAN.md with stages, batches, and threads
- Use a question-driven approach to resolve unknowns

**Planner scope is planning only — no code implementation.**

#### 1.2 Review

**Skill:** `reviewing-workstream-plans`

A Reviewer agent (or human) analyzes the PLAN.md:

- Identifies weaknesses, missing considerations, or risks
- Checks for proper stage/batch/thread breakdown
- Validates structure: `work validate plan`
- Provides structured feedback for revision
- Iteration continues until plan is solid

#### 1.3 Approval Gate (HITL)

Human-in-the-loop approval before execution:

- User reviews final PLAN.md
- `work approve` command stores SHA-256 hash of PLAN.md
- If PLAN.md is modified after approval, approval is auto-revoked
- Approval gates task creation

```bash
work approve              # Blocked if open questions exist
work approve --force      # Approve despite open questions
work approve --revoke     # Revoke approval
```

#### 1.4 Task Creation

After approval, tasks **must** be created using the TASKS.md workflow. This ensures all threads have tasks defined upfront before execution begins.

**Required Workflow:**

```bash
# Step 1: Generate TASKS.md from approved PLAN.md
work tasks generate

# Step 2: Edit TASKS.md to fill in task descriptions for all threads
# (Use your editor to add specific, actionable task names)

# Step 3: Convert to tasks.json (deletes TASKS.md)
work tasks serialize
```

**TASKS.md format:**
```markdown
## Stage 01: Setup

### Batch 01: Core

#### Thread 01: Router
- [ ] Task 01.01.01.01: Create route definitions
- [ ] Task 01.01.01.02: Add middleware chain

#### Thread 02: Config
- [ ] Task 01.01.02.01: Setup environment variables
```

**Status markers:** `[ ]` pending, `[x]` completed, `[~]` in_progress, `[!]` blocked, `[-]` cancelled

**Adding Tasks During Execution:**

Use `work add-task` only for additional tasks discovered mid-execution:

```bash
work add-task --stage 1 --batch 1 --thread 1 --name "Handle edge case discovered during testing"
work add-task   # Interactive mode
```

Each thread contains as many tasks as required. Task names should be actionable.

#### 1.5 Agent Assignment (Optional)

For complex workstreams with specialized agents:

- Define agents in `work/AGENTS.md`
- Assign agents to threads: `work assign --thread "01.01.01" --agent "backend-expert"`
- Assignments are stored in tasks.json

### Phase 2: Execute Workstream

#### 2.1 Prompt Generation

**Skill:** `generating-workstream-prompts`

The Planner agent creates execution prompts for threads. Prompts are saved to individual files in `work/{stream}/prompts/...`.

```bash
work prompt                                  # All threads in workstream
work prompt --stage 1                        # All threads in stage 1
work prompt --stage 1 --batch 1              # All threads in batch 1
work prompt --thread "01.01.01"              # Single thread
```

Prompts include:
- Friendly greeting and context (Stage/Batch/Thread location)
- Thread summary and details from PLAN.md
- Tasks assigned to the thread
- Explicit working directory instruction
- Skill instruction (`implementing-workstream-plans`)

They explicitly exclude agent assignment references in the text, keeping the prompt clean for any agent to pick up.

#### 2.2 Agent Execution

**Skill:** `implementing-workstream-plans`

Agents execute their assigned threads:

```bash
work current --set "000-stream-id"
work continue                    # Find next task
work update --task "01.01.01.01" --status in_progress
# ... do work ...
work update --task "01.01.01.01" --status completed
```

Execution guidelines:
- Reference PLAN.md for context and approach
- Create descriptive documentation in `./files/{stage}/{batch}/{thread}/`
- Log breadcrumbs for recovery: `work update --task "ID" --breadcrumb "..."`

#### 2.3 Batch Iteration

Work progresses batch by batch:

- Complete all threads in a batch before starting the next batch
- User performs testing at stage boundaries
- If issues are found, create fix batches (see 2.4)

#### 2.4 Fix Workflow

When issues are discovered:

- **Fix Batches**: For issues within a stage, append a fix batch
  ```bash
  work add-batch --stage 1 --name "fix-validation"
  ```

- **Fix Stages**: For issues after stage completion, append a fix stage
  ```bash
  work fix --stage 1 --name "fix-auth-race"
  ```

- Planner updates tasks and creates fix prompts
- Fix iteration continues until user accepts

### Phase 3: Documentation & References

#### 3.1 Completion Summary

After all stages complete:

```bash
work complete    # Generates COMPLETION.md
```

COMPLETION.md includes:
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

---

## File Format Conventions

### PLAN.md Format

```markdown
# Plan: {Stream Name}

> **Stream ID:** {id} | **Created:** {date}

## Summary
Brief overview of the workstream goals.

## References
- Link to relevant docs or prior work

## Stages

### Stage 01: {Stage Name}

#### Stage Definition
What this stage accomplishes and its scope.

#### Stage Constitution
Describe how this stage operates: what it needs (inputs), how it's organized (structure), and what it produces (outputs). This section is free-form — write naturally while covering the key points.

#### Stage Questions
- [ ] Open questions to resolve (blocks approval)
- [x] Resolved questions (with decision noted)

#### Stage Batches

##### Batch 01: {Batch Name}
What this batch accomplishes.

###### Thread 01: {Thread Name}
**Summary:** Thread purpose in one sentence.
**Details:** Implementation approach, dependencies, code examples.

###### Thread 02: {Thread Name}
**Summary:** Thread purpose.
**Details:** Implementation details.

##### Batch 02: {Batch Name}
...
```

### AGENTS.md Format (at `work/AGENTS.md`)

Shared across all workstreams in the repository.

> [!IMPORTANT]
> The `Model:` field must use `provider/model` format (e.g., `google/gemini-3-flash-preview`) for compatibility with opencode.

```markdown
# Agents

## Agent Definitions

### backend-expert
**Description:** Specializes in database schema, ORM, migrations
**Best for:** Database setup, complex queries, API design
**Model:** anthropic/claude-opus-4

### frontend-specialist
**Description:** Focuses on UI components, styling, state management
**Best for:** Component refactors, style fixes, form handling
**Model:** anthropic/claude-sonnet-4

### test-writer
**Description:** Writes comprehensive test suites
**Best for:** Unit tests, integration tests, E2E scenarios
**Model:** google/gemini-3-flash-preview
```

CLI commands:
```bash
work agents                    # List all defined agents
work agents --add --name "..." --description "..." --best-for "..." --model "..."
work agents --remove "name"
work assign --thread "01.01.01" --agent "backend-expert"
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
| files/stage-1/01-setup/backend/schema.md | Database schema design |
| src/lib/feature.ts | Core implementation |

## Metrics
- Tasks: 24/24 completed
- Stages: 2
- Fix iterations: 1
```

---

## Agent Roles

| Role | Skill | Responsibilities |
|------|-------|-----------------|
| **Planner** | `create-workstream-plans`, `generating-workstream-prompts` | Creates PLAN.md, adds tasks, creates execution prompts, manages fix batches/stages, generates COMPLETION.md |
| **Reviewer** | `reviewing-workstream-plans` | Reviews PLAN.md for weaknesses, provides structured feedback, validates structure |
| **Executor** | `implementing-workstream-plans` | Assigned to specific threads, implements tasks, creates documentation, runs tests |
| **Documentation** | — | Reads COMPLETION.md and outputs, updates project docs |

### Handoff Between Roles

1. **Planner → Reviewer**: Plan created, ready for review
2. **Reviewer → Planner**: Feedback provided, needs revision (or approved)
3. **Planner → User**: Plan approved, prompts generated, ready for execution
4. **User → Executor**: User starts execution agents with generated prompts
5. **Executor → User**: Thread complete, ready for next batch
6. **User → Planner**: Issues found, need fix batch/stage
7. **Planner → Documentation**: All stages complete, COMPLETION.md ready

---

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

---

## Handling Failure & Iteration

### Recovery

If an agent fails mid-thread:
1. `work continue` displays the last breadcrumb and active task
2. A new agent instance can resume from that point
3. Existing file outputs provide additional context

### Fix Batches

For issues within a stage:
1. Append a fix batch: `work add-batch --stage N --name "fix-validation"`
2. Creates new batch with threads to address the issue
3. Planner generates fix prompts for assigned agents

### Fix Stages

For issues discovered after stage completion:
1. Append a fix stage: `work fix --stage N --name "fix-auth-race"`
2. Creates new stage with its own batches and threads
3. Uses current codebase state as reference

---

## CLI Quick Reference

```bash
# Workstream management
work create --name "feature" --stages N    # Create workstream (stages required)
work current --set "000-feature"           # Set active workstream
work preview                               # Show structure overview
work status                                # Show progress
work list                                  # List tasks and status

# Structure modifications
work add-batch --stage 1 --name "testing"
work add-thread --stage 1 --batch 1 --name "unit-tests"
work edit                                  # Open PLAN.md

# Validation & approval
work validate plan                       # Validate PLAN.md schema
work check plan                            # Check for errors and open questions
work approve                               # Approve plan
work approve --force                       # Approve with open questions

# Task creation (after approval)
work tasks generate                        # Create TASKS.md from PLAN.md
work tasks serialize                       # Convert TASKS.md to tasks.json
work add-task --stage 1 --batch 1 --thread 1 --name "Task description"

# Execution
work multi --batch "01.01"                 # Execute batch in parallel (tmux)
work continue                              # Find next task
work update --task "01.01.01.01" --status completed
work update --task "01.01.01.01" --breadcrumb "..."

# Agent management
work agents                                # List agents
work assign --thread "01.01.01" --agent "name"
work prompt                                # Generate all prompts
work prompt --stage 1                      # Generate prompts for stage 1
work prompt --thread "01.01.01"            # Generate prompt for single thread
work execute --thread "01.01.01"           # Execute thread by ID
work execute --thread "Server Module"      # Execute thread by name
work execute --thread "01.01.01" --dry-run # Preview command without executing

# Fixes
work add-batch --stage 1 --name "fix-issue"
work fix --stage 1 --name "fix-critical"

# Completion
work complete                              # Generate COMPLETION.md
```
