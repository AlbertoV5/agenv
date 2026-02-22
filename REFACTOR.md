Now I have everything I need. Let me compose the comprehensive analysis.

---

# Migration Analysis: Tasks → Threads & Multi-Backend Agent Execution

## Executive Summary

There are two major architectural changes being proposed:

1. **Tasks → Threads**: Remove the 4th-level task granularity (`SS.BB.TT.NN` → `SS.BB.TT`), making threads the atomic unit of work
2. **Multi-Backend Execution**: Replace the tmux-only execution model with an adapter pattern supporting opencode native subagents, Gemini CLI, Claude Code, and the current tmux system

Both changes are complementary — removing tasks reduces tool calls per agent, and native subagent integration eliminates the tmux workaround. Together they create a leaner, more parallel-friendly system.

---

## Part 1: Tasks → Threads Migration

### What Changes Conceptually

| Before (Tasks) | After (Threads-Only) |
|---|---|
| Thread = container of N ordered tasks | Thread = single atomic unit of work |
| Agent updates status per-task (`work update --task "01.01.02.03"`) | Agent updates status per-thread (`work update --thread "01.01.02"`) |
| TASKS.md lists individual work items per thread | Thread description in PLAN.md is the complete work specification |
| `tasks.json` stores task-level status, agent assignment, reports | `threads.json` absorbs status, agent assignment, report, breadcrumb |
| Prompt includes task checklist (`- [ ] 01.01.02.01 Do X`) | Prompt includes thread summary + details from PLAN.md |
| Agent makes N tool calls to update N tasks | Agent makes 1 tool call to update thread status |

### What Must Change

#### A. Data Model Changes (`types.ts`)

**Extend `ThreadMetadata`** to absorb task-level fields:

```typescript
interface ThreadMetadata {
  threadId: string          // "SS.BB.TT" (unchanged)
  threadName: string        // NEW - moved from Task.thread_name
  stageName: string         // NEW - moved from Task.stage_name  
  batchName: string         // NEW - moved from Task.batch_name
  status: ThreadStatus      // NEW - "pending" | "in_progress" | "completed" | "blocked" | "cancelled"
  assignedAgent?: string    // NEW - moved from Task.assigned_agent
  report?: string           // NEW - moved from Task.report
  breadcrumb?: string       // NEW - moved from Task.breadcrumb
  promptPath?: string       // (unchanged)
  sessions: SessionRecord[] // (unchanged)
  // ... rest unchanged
}
```

**Remove/deprecate**: `Task`, `TasksFile`, `TaskStatus`, `TasksMdParseResult`, `ParsedTask`, `ConsolidateResult.tasksGenerated`, `FilterResult.matchingTasks`, `BlockerAnalysis.blockedTasks`

**Adapt**: `EvaluationMetrics` to use `totalThreads` + thread status counts

#### B. Core Library Changes

| File | Change Required | Effort |
|---|---|---|
| **`tasks.ts`** (1338 lines) | **Major rewrite → `thread-store.ts`**. Thread discovery (`discoverThreadsInBatch`) must derive from PLAN.md or threads.json instead of tasks.json. Status CRUD operates on threads.json directly. ID parsing drops the `.NN` component. Session wrappers already delegate to threads.ts. | HIGH |
| **`threads.ts`** (838 lines) | **Expand**. Absorb status/report/breadcrumb/agent-assignment operations. Add `getThreadCounts()`, `groupThreads()`, `discoverThreadsInBatch()` (plan-based). Add locked update operations for status. | HIGH |
| **`tasks-md.ts`** (599 lines) | **Remove entirely**. TASKS.md intermediate format is no longer needed. Agent assignments move to a simpler mechanism (directly in PLAN.md via `@agent:` annotations on thread headers, or a dedicated `work assign` command writing to threads.json). | MEDIUM |
| **`prompts.ts`** (473 lines) | **Modify**. Replace task-checklist section with thread summary/details from PLAN.md (already available in the `PromptContext`). Remove task-loading code. The prompt becomes simpler — it already has `thread.summary` and `thread.details`. | MEDIUM |
| **`update.ts`** | **Simplify**. Already has `updateThreadTasks()`. Replace with a single `updateThread()` that writes to threads.json. | LOW |
| **`status.ts`** | **Adapt**. Use thread counts instead of task counts for workstream status computation. | LOW |
| **`metrics.ts`**, **`reports.ts`**, **`document.ts`** | **Adapt**. Iterate over threads instead of tasks. Reports reference thread-level status. | MEDIUM |
| **`complete.ts`**, **`continue.ts`** | **Adapt**. Completion check = all threads completed. Continue logic = find first non-completed batch. | LOW |
| **`multi-orchestrator.ts`** | **Adapt**. `collectThreadInfoFromTasks()` → `collectThreadInfo()` reading from threads.json + PLAN.md. | MEDIUM |
| **`index.ts`** (public API) | **Major**. Remove 14+ task exports. Add thread-equivalents. This is a breaking change. | HIGH |

#### C. CLI Command Changes

| Command | Change |
|---|---|
| `work tasks generate` | **Remove**. No TASKS.md generation needed. |
| `work tasks serialize` | **Remove**. No TASKS.md → tasks.json serialization. |
| `work add-task` | **Remove**. Threads are defined in PLAN.md. |
| `work update --task` | **Remove `--task` flag**. Keep `--thread` flag only. Becomes `work update --thread "01.01.02" --status completed --report "..."` |
| `work list --tasks` | **Replace with** `work list --threads`. Show thread-level status. |
| `work read --task` | **Replace with** `work read --thread`. |
| `work tree` | **Adapt**. Show threads as leaf nodes (no task children). |
| `work delete` | **Adapt**. Delete by thread/batch/stage (remove task-level delete). |
| `work assign` | **Adapt**. Assign agents to threads directly in threads.json. |
| `work approve tasks` | **Remove or simplify**. Agent assignment could become part of plan approval, or a separate `work assign` step. The approval gate can verify threads have agents assigned. |
| `work approve plan` | **Expand**. Plan approval now also populates threads.json with thread metadata (name, stage, batch, ID) derived from PLAN.md. This replaces the `tasks serialize` step. |
| `work multi` | **Adapt**. Thread discovery from threads.json instead of tasks.json. |

#### D. Skill / Agent Instruction Changes

**`implementing-workstreams/SKILL.md`** — Rewrite:

```markdown
## Execution Rules

1. Work only on your assigned thread.
2. Mark thread start: `work update --thread "ID" --status in_progress`
3. Mark completion with report:
   `work update --thread "ID" --status completed --report "1-2 sentence summary"`
4. If blocked:
   `work update --thread "ID" --status blocked --report "reason and dependency"`
```

**`planning-workstreams/SKILL.md`** — Simplify:
- Remove steps 6-7 (TASKS.md generation and approval)
- Add: "Assign agents to threads: `work assign --thread "01.01.01" --agent "agent-name"`"
- Plan approval auto-populates threads.json

#### E. Approval Workflow Simplification

**Current** (7 steps):
1. Create → 2. Fill PLAN.md → 3. Validate → 4. Approve plan → 5. Generate TASKS.md → 6. Fill/edit TASKS.md → 7. Approve tasks

**After** (5 steps):
1. Create → 2. Fill PLAN.md (with `@agent:` annotations) → 3. Validate → 4. Approve plan (auto-populates threads.json) → 5. Assign agents (if not done in plan)

This removes an entire human-in-the-loop cycle (TASKS.md editing), making the planning phase faster.

#### F. Migration Path for Existing Workstreams

A `migrateTasksToThreads()` function should:
1. Read `tasks.json`
2. Group tasks by thread ID
3. Derive thread status (= worst status among tasks, or completed if all completed)
4. Merge reports into a single thread report
5. Take assigned_agent from any task in the thread
6. Write to `threads.json` (enriching existing entries)
7. Backup and optionally remove `tasks.json`

#### G. Test Updates

~10 test files reference tasks. Each needs adaptation. The `tasks-md.test.ts` can be removed. Others need to switch from task CRUD to thread CRUD.

---

## Part 2: OpenCode Native Orchestration (Session-First)

### Vision

The primary runtime is **inside a live OpenCode session**:

1. User asks the top-level planner agent to execute a batch/thread set.
2. Planner launches worker subagents via **Task tool calls** (parallel when needed).
3. Workers execute thread work using `implementing-workstreams`.
4. Workers/planner update `threads.json` via `work update --thread ...`.
5. Planner summarizes outcomes and next actions.

This is the canonical path. The system should optimize for this user->planner->subagent loop.

### What We Remove or De-Scope

The following are not aligned with the native-only vision and should be removed or frozen:

1. **Multi-backend expansion work** for non-native runtimes.
2. **Subprocess-driven pseudo-subagent orchestration** (`opencode run` pretending to be Task orchestration).
3. **Shell-heavy orchestration layers** built around tmux/session title parsing/marker files for the native path.
4. **Smoke tests that validate subprocess behavior instead of in-session Task behavior**.
5. **New feature work in `work multi` for native mode**. `work multi` may remain as legacy/fallback tooling, but not as the primary architecture.

### Native Contract (What Must Be True)

#### A. Planner Contract

The planner prompt must explicitly require:

- launch subagents using Task tool calls
- run assigned threads in parallel where safe
- mark thread status transitions (`in_progress`, `completed`, `blocked`)
- include short per-thread report text on completion/blocking
- return a deterministic summary shape for post-processing

#### B. Worker Contract

Each worker subagent must:

1. Work only on its assigned thread.
2. Run `work update --thread "ID" --status in_progress` when starting.
3. Run `work update --thread "ID" --status completed --report "..."` on success.
4. Run `work update --thread "ID" --status blocked --report "reason + dependency"` if blocked.

#### C. Agent Configuration Contract

- `agents.yaml` is source of truth for available worker profiles.
- Profiles map to OpenCode subagents (model + behavior + tools + skill usage).
- `@agent:` annotations in PLAN thread definitions (or explicit `work assign`) select the worker profile.

#### D. State Contract

- `threads.json` is the source of truth for execution state.
- Planner and workers must write thread-level status/report updates.
- Thread session references and synthesis output are attached at thread level.

### Verification (Native, Not Subprocess)

Acceptance is prompt-driven in a real OpenCode session:

1. Planner launches one subagent; subagent writes a known artifact file.
2. Planner launches two subagents in parallel; both threads finish with reports.
3. One subagent is intentionally blocked; planner reports mixed completed/blocked outcomes and next steps.

Success criteria are thread status/report correctness and real repository artifacts, not subprocess exit codes.

---

## Part 3: Native Implementation Plan

### Phase 1: Thread Data Model (Foundation)
1. Extend `ThreadMetadata` with status/report/breadcrumb/agent fields
2. Add thread CRUD operations to `threads.ts`
3. Add `discoverThreadsFromPlan()` — derive threads from PLAN.md directly
4. Create migration utility `migrateTasksToThreads()`
5. Update tests

### Phase 2: Thread-Only CLI
1. Update `work update` to support `--thread` as primary mode
2. Update `work list`, `work tree`, `work read` for thread-level display
3. Update `work approve plan` to auto-populate threads.json
4. Remove/deprecate `work tasks generate`, `work tasks serialize`, `work add-task`, `work approve tasks`
5. Update prompt generation to use thread details instead of task checklist
6. Update `implementing-workstreams` skill

### Phase 3: Planner/Worker Native Contracts
1. Finalize planner prompt template for parallel Task orchestration.
2. Finalize worker instruction template (`implementing-workstreams`) for thread-only updates.
3. Define deterministic planner summary schema for thread outcomes.
4. Add acceptance playbooks for the 3 native verification scenarios.

### Phase 4: Agent Configuration and Skills
1. Ensure `agents.yaml` maps cleanly to native OpenCode subagent profiles.
2. Support `@agent:` thread mapping from PLAN.md (with `work assign` fallback).
3. Ensure skills are thread-native and do not reference TASKS.md/task IDs.

### Phase 5: State and Synthesis Integration
1. Stream planner/worker outcomes into `threads.json` consistently.
2. Attach synthesis output at thread level.
3. Ensure resume/continue logic uses thread state only.

### Phase 6: Cleanup and Removal
1. Remove `tasks.json`, `tasks.ts`, `tasks-md.ts` code paths
2. Remove TASKS.md from workflow
3. Remove/freeze native-path-irrelevant shell orchestration code
4. Keep `work multi` as legacy/fallback only, with no new native-mode feature work
5. Update all documentation and skills
6. Final migration tool for existing workstreams

---

## Key Risks & Mitigations (Native-Only)

| Risk | Mitigation |
|---|---|
| Breaking existing workstreams | Migration utility + backward compat reading of tasks.json |
| OpenCode planner may not consistently follow Task/output contract | Tight planner template + explicit acceptance scenarios + schema checks |
| Agent assignment without TASKS.md | `@agent:` annotations in PLAN.md thread headers, or `work assign` command |
| Loss of fine-grained progress tracking (no per-task status) | Thread breadcrumbs + reports provide sufficient granularity; agents can use their own todo tool internally |
| PLAN.md thread details may be insufficient as work specs | Encourage richer thread details in planning; the skill instructions guide this |

The bottom line: **threads are the unit of execution, and OpenCode Task orchestration inside the active user session is the primary runtime**. We should prioritize prompt/skill contracts and thread-state correctness, and stop investing in native-path shell/tmux orchestration layers.
