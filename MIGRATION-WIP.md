# Migration Status: Planning → Workstreams

The "plans" to "workstreams" refactoring is complete. Below is the current implementation status relative to the WORKSTREAM.md specification.

## Completed Refactoring

### Package Rename
- **Package**: `packages/planning/` → `packages/workstreams/`
- **NPM name**: `@agenv/planning` → `@agenv/workstreams`
- **CLI command**: `plan` → `work`
- **Directory**: `docs/plans/` → `docs/work/`
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
| Task ID format | `1.2.3` (stage.thread.task) | `1.00.2.3` (stage.batch.thread.task) |
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

**Backwards compatibility:** Legacy 3-part task IDs are treated as batch 0.

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

---

## Test Status
- **172 tests pass**, 0 failures
- **TypeScript compiles** with no errors

---

## Remaining Gaps vs WORKSTREAM.md Spec

### Medium Priority

#### 1. Status Vocabulary Mismatch
**Spec:** `pending | active | blocked | review | complete`
**Current:** `pending | in_progress | completed | blocked | cancelled`
**Work needed:** Decide whether to align with spec or document the difference.

### Lower Priority

#### 2. Evaluation Phase Formalization
**Spec:** End of stage/workstream has formal evaluation gate.
**Current:** Implicit via task completion.
**Work needed:** Evaluation skill/command for stage gates.

#### 3. Documentation Phase (99-document)
**Spec:** Final batch synthesizes output into clean documentation.
**Current:** No automated documentation synthesis.
**Work needed:** Convention for `99-document` batch; skill for documentation synthesis.

---

## Implementation Priorities

If continuing implementation, recommended order:

1. **Evaluation gates** - Quality checkpoints
2. **Documentation phase** - Final synthesis
3. **Status vocabulary** - Clean up technical debt