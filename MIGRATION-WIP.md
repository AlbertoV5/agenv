# Migration Status: Planning → Workstreams

The "plans" to "workstreams" refactoring is complete. Below is the current implementation status relative to the WORKSTREAM.md specification.

## Completed Refactoring

### Package Rename
- **Package**: `packages/planning/` → `packages/workstreams/`
- **NPM name**: `@agenv/planning` → `@agenv/workstreams`
- **CLI command**: `plan` → `work`
- **Directory**: `docs/plans/` → `work/` (at repository root)
- **Plan file**: Kept as `PLAN.md`

### Terminology Changes
| Old | New |
|-----|-----|
| plan | stream |
| planId | streamId |
| PlanMetadata | StreamMetadata |
| PlansIndex | WorkIndex |
| PlanProgress | StreamProgress |
| getPlanProgress | getStreamProgress |
| generatePlan | generateStream |

### Skills Renamed
| Old | New |
|-----|-----|
| creating-plans | create-workstream-plans |
| implementing-plans | implementing-workstream-plans |
| evaluating-plans | evaluating-workstream-outputs |
| documenting-plans | documenting-workstream-outputs |
| reviewing-plans | reviewing-workstream-plans |

### Removed
- Visualization code (visualize.ts, view.ts)

---

## Recently Implemented Features

### 1. Batch Hierarchy Level
The spec requires a 5-level hierarchy: Workstream → Stage → Batch → Thread → Task

| Aspect | Before | After |
|--------|--------|-------|
| Hierarchy | Stage → Thread → Task | Stage → **Batch** → Thread → Task |
| Task ID format | `1.2.3` (stage.thread.task) | `01.01.02.03` (stage.batch.thread.task) |
| PLAN.md structure | H4: Stage, H5: Thread | H4: Stage, H5: Batch, H6: Thread |

**Files modified:**
- `src/lib/types.ts` - Added `BatchDefinition`, `batch_name` to Task
- `src/lib/tasks.ts` - 4-part ID parsing, `deleteTasksByBatch`, batch grouping
- `src/lib/stream-parser.ts` - H5 batch / H6 thread parsing
- `src/cli/add-task.ts` - `--batch` option (required)
- `src/cli/delete.ts` - `--batch` delete option, updated `--thread` format
- `src/cli/preview.ts` - Batch display in preview
- `src/lib/consolidate.ts` - Batch validation
- `src/lib/document.ts` - `batchCount` in reports
- `src/lib/metrics.ts` - `blockersByBatch` analysis

### 2. Approval Gate (HITL)
The spec requires human-in-the-loop approval before task creation.

**Approval status:** `draft` | `approved` | `revoked`

**Modification detection:** SHA-256 hash of PLAN.md stored on approval; auto-revokes if plan changes after approval.

**New files:**
- `src/lib/approval.ts` - Approval logic library
- `src/cli/approve.ts` - `work approve` CLI command

**Commands:**
```bash
work approve                    # Approve current workstream
work approve --stream <id>      # Approve specific workstream
work approve --revoke           # Revoke approval
work approve --revoke --reason "..."  # Revoke with reason
```

**Gate enforcement:** `work add-task` now requires plan approval before adding tasks.

### 3. Recovery & Breadcrumbs
Enables agent resilience and context resumption.

**Features:**
- **Breadcrumbs:** `breadcrumb` field in `Task` to log last action.
- **Continue Command:** `work continue` displays active task, last breadcrumb, and next steps.
- **CLI:** `work update --breadcrumb "..."` to save state.

**Files:**
- `src/lib/types.ts` - Added `breadcrumb` to `Task`
- `src/lib/tasks.ts` - Breadcrumb persistence
- `src/cli/continue.ts` - `work continue` command
- `src/lib/continue.ts` - Context logic

### 4. File Output Structure
Auto-managed directory structure for task outputs.

**Structure:** `files/stage-{N}/{batchPrefix}-{batchName}/{threadName}/`
**Automation:** Created automatically when task status changes to `in_progress`.

**Files:**
- `src/lib/files.ts` - Directory generation and creation logic
- `src/lib/update.ts` - Triggers creation on status update

### 5. Agent Assignments
Track which agent is responsible for a task.

**Features:**
- `assigned_agent` field in `Task`.
- CLI option: `work update --agent "AgentName"`.

**Files:**
- `src/lib/types.ts` - Added `assigned_agent`
- `src/lib/tasks.ts` - Refactored update logic

### 6. Fix Stages
Scaffolding for iterative fixes.

**Command:** `work fix --stage <n> --name "fix-name"`
**Action:** Appends a new stage to `PLAN.md` explicitly for fixes.

**Files:**
- `src/lib/fix.ts` - Template appending logic
- `src/cli/fix.ts` - CLI command

### 7. Workstream Directory Location
**Requirement:** Workstreams at `work/` (repository root) instead of `docs/work/`.
**Status:** Completed. Default path updated in `repo.ts`.

**Files:**
- `src/lib/repo.ts` - Updated default path constant
- `packages/workstreams/README.md` - Documentation updated
- Skills updated referencing `work/`

### 8. TASKS.md Support
**Requirement:** Human-readable task file that serializes to tasks.json, then auto-deleted.
**Status:** Completed.

**New files:**
- `src/lib/tasks-md.ts` - Parser and generator for TASKS.md format
- `src/cli/tasks.ts` - `work tasks` CLI command

**Commands:**
```bash
work tasks generate             # Create TASKS.md from PLAN.md
work tasks serialize            # Convert TASKS.md to tasks.json
```

### 9. AGENTS.md Configuration
**Requirement:** Define available agents and their thread assignments per batch at `work/AGENTS.md` (shared across all workstreams).
**Status:** Completed.

**New files:**
- `src/lib/agents.ts` - Types, parsing, and management for AGENTS.md
- `src/cli/agents.ts` - `work agents` CLI command
- `src/cli/assign.ts` - `work assign` CLI command
- `__tests__/lib/agents.test.ts` - Unit tests (20 tests)

**Types added:**
- `AgentDefinition` - Agent name, capabilities, constraints
- `BatchAssignment` - Stream, stage.batch, thread, agent assignment
- `AgentsConfig` - Full agents configuration

**Commands:**
```bash
work agents                              # List all agents
work agents --add --name "claude-opus" --capabilities "..." --constraints "..."
work agents --remove "agent-name"        # Remove agent

work assign --batch "01.01" --thread "backend" --agent "claude-opus"
work assign --batch "01.01" --list        # List assignments for batch
work assign --clear --batch "01.01" --thread "backend"  # Remove assignment
```

**Integration:** `work continue` now shows assigned agent for active/next task.

---

## Test Status
- **196 tests pass**, 0 failures
- **TypeScript compiles** with minor pre-existing warnings in tasks-md.ts

---

## Remaining Gaps vs WORKSTREAM.md Spec

### High Priority (Phase 1 Support)

#### 1. Prompt Generation
**Requirement:** Generate execution prompts for agents with full thread context.
**Current:** No prompt generation capability.
**Work needed:**
- New file: `src/lib/prompts.ts` - Prompt template generation
- New command: `work prompt --thread "01.00.01"` - Generate thread execution prompt
- Include: thread summary, tasks, PLAN.md context, parallel threads, `work/TESTS.md` requirements

### Medium Priority (Phase 2-3 Support)

#### 2. COMPLETION.md Generation
**Requirement:** Auto-generate completion summary with accomplishments, insights, file references.
**Current:** `generateReport()` and `generateSummary()` exist but output strings, not files.
**Work needed:**
- New command: `work complete` (or update existing) - Generate COMPLETION.md file in workstream directory
- Include: accomplishments template, file index, metrics

#### 3. Fix Batch Support
**Requirement:** Create fix batches within a stage (not just fix batches within a stage).
**Current:** `work fix` only appends new stages.
**Work needed:**
- Update `src/lib/fix.ts` - Add batch insertion logic
- Update `src/cli/fix.ts` - Add `--batch` option
- Command: `work fix --batch --stage N --name "fix-validation"`

#### 4. TESTS.md Support
**Requirement:** Define test requirements at `work/TESTS.md` (shared across all workstreams) that agents reference.
**Current:** No test integration.
**Work needed:**
- New file: `src/lib/tests-md.ts` - Parser for TESTS.md format
- Integration with `work continue` to show test commands
- Integration with `work prompt` to include test requirements

### Lower Priority

#### 5. Status Vocabulary
**Spec originally:** `pending | active | blocked | review | complete`
**Current:** `pending | in_progress | completed | blocked | cancelled`
**Decision:** Keep current vocabulary (documented in WORKSTREAM.md).

#### 6. Evaluation Phase Formalization
**Spec:** End of stage/workstream has formal evaluation gate.
**Current:** Implicit via task completion and user testing.
**Work needed:** Optional - could add `work evaluate` command for formal stage sign-off.

---

## Implementation Priorities

Recommended order for continuing implementation:

### Phase 1 Support (Setup Workstream)
1. ~~**AGENTS.md support** - Agent configuration and assignment~~ ✅ Completed
2. **Prompt generation** - Execution prompts for agents

### Phase 2-3 Support (Execute & Document)
3. **COMPLETION.md generation** - Final completion summary output
4. **Fix batch support** - In-stage fix workflow
5. **TESTS.md support** - Test requirements integration (at `work/TESTS.md`)

### Optional Enhancements
6. **Evaluation command** - Formal stage sign-off