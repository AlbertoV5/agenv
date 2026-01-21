---
name: create-workstream-plans
description: How to create a workstream plan for development tasks. Plans are for medium to large tasks or multi-session work. Not needed for small fixes.
---

# Creating Workstream Plans

## When to Create

- Medium to large features
- Multi-stage implementations
- Tasks spanning multiple sessions

**Not needed for:** Small fixes, single-file changes.

## Workflow Overview

Your scope is **planning only** — you do not implement code. Follow this workflow:

1. **Create workstream** — `work create --name "feature" --stages N`
2. **Fill out PLAN.md** — Define stages, batches, threads, and resolve questions
3. **Ask user to review PLAN.md** — Present `work preview` output and **wait for confirmation** before proceeding
4. **User approves plan** — Tell user to run `work approve` (you MUST NOT run this yourself)
5. **Generate TASKS.md** — Run `work tasks generate`, then fill in task descriptions
6. **Ask user to review TASKS.md** — Present the tasks and **wait for confirmation** before serializing
7. **Serialize tasks** — Run `work tasks serialize` only after user confirms
8. **Assign agents** — Use `work assign` to map agents to threads (if `work/AGENTS.md` exists)
9. **Generate prompts** — Use `work prompt` to create execution context
10. **Ask user to run agents** — Hand off prompts to user for execution
11. **Wait for instructions** — User may request fixes, additional stages, or adjustments

The user manages agent execution. Your job ends when prompts are ready.

**CRITICAL:** Steps 3, 4, and 6 are review checkpoints. You MUST wait for explicit user confirmation before proceeding past each checkpoint. Never assume approval.

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

Shared configuration files in `./work/` (user-managed, read-only for planning agent):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent definitions for assignment and prompts |
| `TESTS.md` | Test requirements included in execution prompts |

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

###### Thread 01: {Thread Name}
**Summary:** Short description
**Details:** Implementation notes, dependencies, code examples
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
work validate plan  # Validates PLAN.md structure and reports open questions
work check plan     # Lists all unchecked items with line numbers
work approve      # Approve plan (blocked if open questions)
work approve --force  # Approve with open questions
```

## Review Checkpoint: PLAN.md

After filling out PLAN.md, you MUST pause and ask for user review:

1. Run `work validate plan` to validate structure
2. Run `work preview` (detailed)
3. Present the preview output to the user
4. Ask: "Does this plan structure look correct? Any changes needed before approval?"
5. **Wait for explicit confirmation** — do not proceed until user confirms
6. If user requests changes, make edits and repeat from step 1
7. Once confirmed, tell user: "Please run `work approve` to approve the plan"

**You MUST NOT run `work approve` yourself.** The user must run this command to maintain human-in-the-loop control.

## Create Tasks (Required Workflow)

After approval, tasks **must** be created using the TASKS.md workflow:

```bash
# Step 1: Generate TASKS.md from approved PLAN.md
work tasks generate

# Step 2: Edit TASKS.md to fill in task descriptions for all threads
# Add specific, actionable task names for each thread

# Step 3: Ask user to review TASKS.md (see checkpoint below)

# Step 4: Convert to tasks.json (deletes TASKS.md)
work tasks serialize
```

**TASKS.md format:**
```markdown
## Stage 01: Setup

### Batch 01: Core

#### Thread 01: Router
- [ ] Task 01.01.01.01: Create route definitions
- [ ] Task 01.01.01.02: Add middleware chain
```

Status markers: `[ ]` pending, `[x]` completed, `[~]` in_progress, `[!]` blocked, `[-]` cancelled

## Review Checkpoint: TASKS.md

After filling in task descriptions, you MUST pause and ask for user review:

1. Present the TASKS.md content or a summary of tasks per thread
2. Ask: "Do these tasks look correct? Any additions or changes needed?"
3. **Wait for explicit confirmation** — do not serialize until user confirms
4. If user requests changes, make edits and repeat from step 1
5. Once confirmed, run `work tasks serialize`
6. Run `work tree` to view the current stream structure with task count

**Do not serialize tasks without user review.** Task descriptions drive agent execution.

Use `work add-task` only for tasks discovered during execution:
```bash
work add-task --stage 1 --batch 1 --thread 1 --name "Handle edge case"
```

## Assign Agents to Threads (Optional)

If `work/AGENTS.md` exists, assign agents to threads before generating prompts:

```bash
work agents                                      # List available agents
work assign --thread "01.01.01" --agent "backend-expert"
work assign --thread "01.01.02" --agent "frontend-specialist"
```

Assignments are stored in tasks.json.

**Note:** `work/AGENTS.md` and `work/TESTS.md` are user-managed configuration files. The planning agent does not create or edit them—only reads them for agent assignment and prompt generation.

## Generate Agent Prompts

Create execution prompts for implementation agents:

```bash
work prompt                                  # Generate ALL prompts for the workstream (Recommended)
work prompt --stage 1                        # Generate all prompts for stage 1
```

Prompts are saved to structured directories: `work/{stream-id}/prompts/{stage}/{batch}/{thread}.md`.

## Handoff to User

When prompts are ready:

1. Show the user the generated prompts
2. Explain which threads can run in parallel (same batch)
3. Ask user to execute with their implementation agents
4. Wait for user to report completion or issues

If the user reports problems:
- Use `work update --task "01.01.01.01" --status blocked` to mark issues
- Add fix stages with `work fix` if needed
- Regenerate prompts after adjustments

After a stage completes, generate a stage report with `work report --stage N` to review progress before proceeding to the next stage.

---

## CLI Reference

```bash
# Create & setup
work create --name "feature-name" --stages N
work current --set "000-feature-name"

# Structure
work add-batch --stage "setup" --name "batch-name"
work add-thread --stage "setup" --batch "core" --name "thread-name"
work edit

# Validate & approve
work preview
work validate plan
work check plan
work approve

# Tasks (required workflow after approval)
work tasks generate              # Create TASKS.md from PLAN.md
work tasks serialize             # Convert TASKS.md to tasks.json
work add-task --stage 1 --batch 1 --thread 1 --name "..."  # Only for mid-execution additions

# Agent assignment (if work/AGENTS.md exists)
work agents                      # List available agents
work assign --thread "01.01.01" --agent "backend-expert"

# Agent prompts
work prompt --stage 1 --batch 1 --thread 1

# Status updates (after user feedback)
work update --task "01.01.01.01" --status completed --report "Summary of work done"
work update --task "01.01.01.01" --status blocked
work fix   # Add fix stage
work approve --revoke --reason "Fix stage"

# Reports & completion
work report --stage 1            # Generate stage report
work complete                    # Generate COMPLETION.md
```
