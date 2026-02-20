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

## Part 2: Multi-Backend Agent Execution (Adapter Pattern)

### Current Architecture (tmux-only)

```
work multi --batch "01.01"
  → multi-orchestrator.ts: discover threads from tasks.json
  → opencode.ts: build massive sh -c shell scripts with retry logic
  → tmux.ts: create session, split panes, spawn processes
  → marker-polling.ts: watch /tmp files for completion
  → session close: grep opencode session list with jq for tracking IDs
```

**Pain points**: Shell escaping hell (1018 lines of opencode.ts), temp file IPC, fragile session discovery by title grepping, tmux dependency, 3-second stagger delays, no programmatic control.

### Proposed Architecture

```
work multi --batch "01.01" [--backend opencode-subagent|opencode-sdk|tmux|gemini|claude]
  → multi-orchestrator.ts: discover threads (backend-agnostic)
  → AgentExecutionBackend.executeParallel(threads)
      ├── OpenCodeSubagentBackend  (planning agent spawns child sessions)
      ├── OpenCodeSdkBackend       (SDK session.prompt() calls)
      ├── OpenCodeTmuxBackend      (current system, preserved)
      ├── GeminiCliBackend         (gemini CLI wrapper)
      └── ClaudeCodeBackend        (claude CLI wrapper)
```

### Backend Interface

```typescript
interface AgentExecutionBackend {
  readonly name: string
  
  /** Check if backend tooling is available */
  isAvailable(): Promise<boolean>
  
  /** Initialize (e.g., start opencode serve) */
  initialize(config: BackendConfig): Promise<void>
  
  /** Execute threads in parallel, return results as they complete */
  executeBatch(threads: ThreadExecutionRequest[]): AsyncIterable<ThreadExecutionResult>
  
  /** Abort all running threads */
  abortAll(): Promise<void>
  
  /** Cleanup resources */
  dispose(): Promise<void>
}

interface BackendConfig {
  repoRoot: string
  streamId: string
  port?: number              // For opencode serve
  synthesisEnabled: boolean
  synthesisModels?: NormalizedModelSpec[]
  maxParallel?: number       // Max concurrent threads
}

interface ThreadExecutionRequest {
  threadId: string
  threadName: string
  promptPath: string
  models: NormalizedModelSpec[]
  agentName: string
  synthesisModels?: NormalizedModelSpec[]
}

interface ThreadExecutionResult {
  threadId: string
  status: 'completed' | 'failed' | 'aborted'
  sessionId?: string
  duration: number
  synthesisOutput?: string
}
```

### Backend Implementations

#### 1. `OpenCodeSubagentBackend` — The Deep Integration

This is the key new backend. A **single opencode session** runs the planning/orchestrator agent, which spawns parallel child sessions using the native Task tool (subagents).

**How it works:**
- Configure custom subagents in `opencode.json` (or `.opencode/agents/`) for each agent defined in `agents.yaml`
- The planning agent's prompt instructs it to launch N subagents in parallel using the Task tool
- Each subagent gets its thread prompt, model override, and the `implementing-workstreams` skill
- opencode handles parallelism natively — multiple Task tool calls in one response = parallel execution
- Child sessions are navigable with `<Leader>+Right/Left`
- Synthesis can be another subagent invocation after each worker completes

**Configuration generation:**
```typescript
// Dynamically generate .opencode/agents/ from agents.yaml
function generateOpenCodeAgents(agentsConfig: AgentsConfigYaml): void {
  for (const agent of agentsConfig.agents) {
    // Create .opencode/agents/{name}.md with:
    // - mode: subagent
    // - model: agent.models[0] (primary model)
    // - hidden: true (only invoked programmatically)
    // - tools: full access
    // - prompt: implementing-workstreams skill content
  }
}
```

**Orchestrator prompt generation:**
```typescript
function generateOrchestratorPrompt(threads: ThreadExecutionRequest[]): string {
  return `
You are orchestrating parallel work for batch ${batchId}.

Launch the following subagents IN PARALLEL (use multiple Task tool calls in a single response):

${threads.map(t => `
- Thread ${t.threadId} "${t.threadName}": 
  Use @${t.agentName} subagent with this prompt:
  ${t.promptPath}
`).join('\n')}

Wait for all to complete, then summarize results.
  `
}
```

**Advantages:**
- Single opencode session = single context, single TUI
- Native parallel execution (opencode's Task tool supports parallel invocations)
- Child session navigation built-in
- No tmux, no shell scripts, no temp files
- Planning agent can react to results and make decisions
- Synthesis is natural (planning agent summarizes after workers complete)

**What's needed:**
- Dynamic agent generation from `agents.yaml` → `.opencode/agents/*.md`
- Orchestrator prompt template
- Event monitoring via SDK `event.subscribe()` to update threads.json
- Handle model override per-subagent (via agent config `model` field)

#### 2. `OpenCodeSdkBackend` — Programmatic Headless

Uses the SDK directly for headless/CI execution without the TUI.

```typescript
class OpenCodeSdkBackend implements AgentExecutionBackend {
  async *executeBatch(threads: ThreadExecutionRequest[]) {
    const client = createOpencodeClient({ baseUrl: `http://localhost:${this.port}` })
    
    const promises = threads.map(async (thread) => {
      const session = await client.session.create({ body: { title: thread.threadName } })
      const prompt = readFileSync(thread.promptPath, 'utf-8')
      const [providerID, modelID] = thread.models[0].model.split('/')
      
      const result = await client.session.prompt({
        path: { id: session.data.id },
        body: {
          model: { providerID, modelID },
          parts: [{ type: 'text', text: prompt }],
        },
      })
      
      return { threadId: thread.threadId, status: 'completed', sessionId: session.data.id }
    })
    
    for (const result of await Promise.allSettled(promises)) {
      yield result.status === 'fulfilled' ? result.value : /* error result */
    }
  }
}
```

#### 3. `OpenCodeTmuxBackend` — Current System Preserved

Wraps the existing `tmux.ts` + `opencode.ts` code behind the interface. Minimal refactoring — just adapting the function signatures. This is the fallback for users who prefer the visual 2x2 grid.

#### 4. `GeminiCliBackend` / `ClaudeCodeBackend`

CLI wrappers that construct appropriate shell commands for each tool:

```typescript
class GeminiCliBackend implements AgentExecutionBackend {
  buildCommand(thread: ThreadExecutionRequest): string {
    return `cat "${thread.promptPath}" | gemini --model ${thread.models[0].model}`
  }
}

class ClaudeCodeBackend implements AgentExecutionBackend {
  buildCommand(thread: ThreadExecutionRequest): string {
    const prompt = readFileSync(thread.promptPath, 'utf-8')
    return `claude -p "${prompt}" --model ${thread.models[0].model}`
  }
}
```

These can optionally use tmux for visual multiplexing (shared infrastructure), or run headless.

### Configuration

Add backend selection to `agents.yaml` or a new `execution.json`:

```yaml
# agents.yaml (extended)
execution:
  backend: opencode-subagent  # opencode-subagent | opencode-sdk | tmux | gemini | claude
  port: 4096
  max_parallel: 8

agents:
  - name: default
    # ... (unchanged)
```

Or via CLI flag: `work multi --batch "01.01" --backend opencode-subagent`

---

## Part 3: Combined Implementation Plan

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

### Phase 3: Backend Interface
1. Define `AgentExecutionBackend` interface
2. Refactor current tmux code into `OpenCodeTmuxBackend`
3. Make `multi-orchestrator.ts` backend-agnostic
4. Add backend selection to config + CLI

### Phase 4: OpenCode Subagent Backend (Deep Integration)
1. Build dynamic agent generation from `agents.yaml` → `.opencode/agents/*.md`
2. Build orchestrator prompt generator
3. Implement `OpenCodeSubagentBackend` using the SDK
4. Add event monitoring for threads.json updates
5. Handle synthesis as subagent invocation

### Phase 5: Additional Backends
1. `OpenCodeSdkBackend` for headless/CI
2. `GeminiCliBackend` 
3. `ClaudeCodeBackend`

### Phase 6: Cleanup
1. Remove `tasks.json`, `tasks.ts`, `tasks-md.ts` code paths
2. Remove TASKS.md from workflow
3. Update all documentation and skills
4. Final migration tool for existing workstreams

---

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Breaking existing workstreams | Migration utility + backward compat reading of tasks.json |
| OpenCode subagent model limitations (max parallel, model override) | Keep tmux backend as fallback; test SDK limits early |
| Agent assignment without TASKS.md | `@agent:` annotations in PLAN.md thread headers, or `work assign` command |
| Loss of fine-grained progress tracking (no per-task status) | Thread breadcrumbs + reports provide sufficient granularity; agents can use their own todo tool internally |
| PLAN.md thread details may be insufficient as work specs | Encourage richer thread details in planning; the skill instructions guide this |

The bottom line: **tasks were a proxy for "what should the agent do" but the thread summary+details in PLAN.md already carry that information**. Removing the task layer eliminates redundancy, reduces agent tool calls from N to 1 per thread, and enables the leaner execution model needed for native subagent integration.
