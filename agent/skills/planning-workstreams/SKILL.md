---
name: planning-workstreams
description: How to create a workstream plan for development tasks. Plans are for medium to large tasks or multi-session work. Not needed for small fixes.
---

# Creating Workstream Plans

## Workflow Overview

Your scope is **planning only** — you do not implement code. Follow this workflow:

1. **Create workstream** — `work create --name "feature" --stages N`
2. **Fill out PLAN.md** — Define stages, batches, threads, and resolve questions. Include working packages in details.
3. **Review PLAN.md** — Present `work preview` and ask user to review.
4. **Approve Plan** — User runs `!work approve plan`. This automatically generates `TASKS.md`.
5. **Fill out TASKS.md** — Define task descriptions and assign agents to threads.
6. **Review TASKS.md** — Ask user to review the tasks and assignments.
7. **Approve Tasks** — User runs `!work approve tasks`. This serializes tasks and generates prompts automatically.
8. **Link Session** — Use `workstream_link_planning_session` tool to link this session to the workstream.
9. **Handoff** — Ask user to run agents.

**CRITICAL:** Steps 3, 4, 6, and 7 are review checkpoints. You MUST wait for explicit user confirmation before proceeding past each checkpoint. Never assume approval.

**IMPORTANT:** Always use the `workstream_link_planning_session` tool after task approval. This allows the user to resume this planning conversation later with `work plan`.

---

## Revision Workflow

Use this workflow when you need to add new stages to a workstream that is already in progress or completed. This allows for iterative development without disrupting existing work.

1. **Start Revision** — `work revision --name "refinement"`
   - Adds a new stage to `PLAN.md`
   - Unlocks `PLAN.md` for editing
2. **Fill out PLAN.md** — Define the new stage's content (batches, threads)
3. **Review PLAN.md** — Present `work preview` and ask user to review
4. **Approve Revision** — User runs `!work approve revision`
   - Generates tasks for the *new stage only* in `TASKS.md`
5. **Fill out TASKS.md** — Define tasks and assign agents for the new stage
6. **Review TASKS.md** — Ask user to review
7. **Approve Tasks** — User runs `!work approve tasks`

**Note:** This flow mirrors the initial planning flow (Plan → Approve → Tasks → Approve) but is scoped to the new revision stage.

**Recommendation:** Normally, you should use `work fix` for correcting issues in existing threads *before* starting a revision for new work.

### Example: Adding a "Polish" Stage

```bash
# 1. User realizes more work is needed
> "Please add a polishing stage to fix UI glitches."

# 2. Agent starts revision
work revision --name "UI Polish"

# 3. Agent edits PLAN.md to define the new stage structure
# ... edits PLAN.md ...

# 4. Agent requests review
> "I've added the UI Polish stage. Please review the plan."

# 5. User approves revision
!work approve revision

# 6. Agent edits TASKS.md to define specific tasks
# ... edits TASKS.md ...

# 7. Agent requests final review
> "Tasks are ready. Please approve to start execution."

# 8. User approves tasks
!work approve tasks
```

---

## Create a Workstream

```bash
work create --name "feature-name" --stages 4  # --stages is required
work current --set "000-feature-name"         # Set as active
```

## Structure Overview

Workstreams live in `./work/{id}/`:

| File | Purpose |
|------|---------|
| `PLAN.md` | Stages, batches, threads, documentation |
| `TASKS.md` | Intermediate task file (temporary, during task creation) |
| `tasks.json` | Task tracking (CLI managed) |

**Hierarchy:** Stage → Batch → Thread → Task
**Execution:** Stages/batches run serially; threads run in parallel within a batch.
**Thread Limit:** Each batch supports up to **8 threads**

## Fill in PLAN.md

```markdown
# Plan: {Name}

## Summary
Brief overview of what this workstream achieves.

## Stages

### Stage 01: {Stage Name}

#### Stage Definition
What this stage accomplishes.

#### Stage Constitution
Describe inputs (what this stage needs), structure (how it's organized), and outputs (what it produces).

#### Stage Questions
- [ ] Open questions (blocks approval)
- [x] Resolved questions

#### Stage Batches

##### Batch 01: {Batch Name}

Batch purpose description.

###### Thread 01: {Thread Name}

**Summary:**
Short description of what this thread accomplishes.

**Details:**
- Working packages: `./packages/my-app`, `./packages/core`
- Implementation notes
- Dependencies and requirements
- Code examples if needed
```

## Add Structure

Commands accept stage/batch/thread names or numeric indices.

```bash
work add-batch --stage "setup" --name "testing"
work add-thread --stage "setup" --batch "core" --name "unit-tests"
work edit       # Open PLAN.md in editor
```

## Validate & Approve

```bash
work preview      # Shows structure with progress
work validate plan  # Validates PLAN.md structure (schema only)
work check plan     # Comprehensive check (schema, open questions, missing inputs)
```

## Review Checkpoint: PLAN.md

After filling out PLAN.md:

1. Run `work check plan` to validate structure and questions.
2. Run `work preview` and present the output to the user.
3. **Wait for confirmation.**
4. Ask the user to run `!work approve plan`.

**You MUST NOT run `work approve *` yourself.** The user must run this command (with `!` prefix) to maintain human-in-the-loop control.

## Create Tasks & Assign Agents

After plan approval, `TASKS.md` is automatically created. You must edit this file to:
1. Add actionable task descriptions
2. Assign agents to threads using `@agent:name` syntax

**TASKS.md format:**
```markdown
## Stage 01: Setup

### Batch 01: Core

#### Thread 01: Router @agent:backend-expert
- [ ] Task 01.01.01.01: Create route definitions
- [ ] Task 01.01.01.02: Add middleware chain
```

Use `work agents` to see available agents.

## Review Checkpoint: TASKS.md

After editing `TASKS.md`, ask the user to review. Once confirmed, ask them to run:

```bash
!work approve tasks
```

This command validates and serializes the tasks and assignments.

**Do not proceed without user approval.** Task descriptions and agent assignments drive execution.


## Best Practices

- Organize stages and batches for maximum parallelization. The more tasks we can work on at the same time the better, even if they have small overlaps.
- Don't create threads or batches only for error handling implementation or test running. Include error handling and tests in the tasks for the threads if any.
- A final review, documentation, integration or refinement stage at the end is fine although not required, depends on the nature of the work.
---

## CLI Reference

```bash
# Create & setup
work create --name "feature-name" --stages N
work current --set "000-feature-name"

# Structure
work add-batch --stage "setup" --name "batch-name"
work add-thread --stage "setup" --batch "core" --name "thread-name"

# Validate & approve
work preview
work check plan
!work approve plan               # User only - Generates TASKS.md
!work approve tasks              # User only - Serializes TASKS.md

# Tasks
work add-task --stage 1 --batch 1 --thread 1 --name "..."  # Mid-execution additions

# Agents & Prompts
work agents                      # List available agents
work assign --thread "01.01.01" --agent "backend-expert" # Manual assignment
work prompt --stage 1 --batch 1  # Manual prompt regeneration (if needed)

# Revision
work revision --name "stage-name" # Add new stage to active workstream
!work approve revision           # User only - Generates TASKS.md for new stage

# Interactive Fix
!work fix                        # User only - Interactive fix menu
!work fix --thread "01.01.01" --resume  # User only - Resume existing session
!work fix --thread "01.01.01" --retry   # User only - Retry with same agent
!work fix --thread "01.01.01" --agent "name" # User only - Retry with different agent

# Reports
work report --stage 1
```
