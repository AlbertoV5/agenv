# Autonomous Stage Execution: Hierarchical Agent Orchestration

## Overview

This document outlines an architecture for automating workstream execution at the stage level, using hierarchical agents where summarizers oversee workers and evaluators gate batch progression.

## Goal

Run an entire stage without human intervention:
- Threads execute in parallel within batches
- Each thread gets a summarizer agent that evaluates the worker's output
- Batch evaluator reviews all thread summaries before proceeding to next batch
- Stage completes only if all batches pass evaluation

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    STAGE ORCHESTRATOR                   │
│              (runs entire stage autonomously)           │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  BATCH RUNNER   │ │  BATCH RUNNER   │ │  BATCH RUNNER   │
│   + EVALUATOR   │ │   + EVALUATOR   │ │   + EVALUATOR   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
    ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
    ▼         ▼         ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Thread │ │Thread │ │Thread │ │Thread │ │Thread │ │Thread │
│Worker │ │Worker │ │Worker │ │Worker │ │Worker │ │Worker │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │         │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Summary│ │Summary│ │Summary│ │Summary│ │Summary│ │Summary│
│ Agent │ │ Agent │ │ Agent │ │ Agent │ │ Agent │ │ Agent │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

## Implementation

### New CLI Commands

Commands wrap `opencode run` to execute agents:

```bash
# Execute a single thread with summarizer
work run thread 01.01.01 --with-summary

# Execute all threads in a batch (parallel), then evaluate
work run batch 01.01 --auto-evaluate

# Execute entire stage (batches sequentially, threads in parallel)
work run stage 1 --autonomous
```

### Agent Roles in `agents.yaml`

```yaml
agents:
  # Worker agents (existing)
  - name: implementing-workstreams
    role: worker
    description: Executes implementation tasks

  # Summarizer agent (new)
  - name: thread-summarizer
    role: summarizer
    description: Reviews completed thread work and produces structured summary
    outputs:
      - quality_score: 1-10
      - issues_found: list
      - files_changed: list
      - recommendation: proceed|review|block

  # Batch evaluator agent (new)
  - name: batch-evaluator
    role: evaluator
    description: Reviews thread summaries to determine batch success
    inputs:
      - thread_summaries: all summaries from batch
    outputs:
      - batch_score: 1-10
      - proceed: boolean
      - blockers: list
      - recommendations: list
```

### Data Structures

Add to `tasks.json`:

```json
{
  "threads": {
    "01.01.01": {
      "tasks": [...],
      "summary": {
        "generatedAt": "2024-01-22T...",
        "agentModel": "anthropic/claude-sonnet-4-5",
        "qualityScore": 8,
        "filesChanged": ["src/foo.ts", "src/bar.ts"],
        "issuesFound": [],
        "recommendation": "proceed",
        "narrative": "Implemented feature X with tests..."
      }
    }
  },
  "batches": {
    "01.01": {
      "evaluation": {
        "evaluatedAt": "2024-01-22T...",
        "batchScore": 8.5,
        "proceed": true,
        "blockers": [],
        "threadScores": {"01.01.01": 8, "01.01.02": 9}
      }
    }
  }
}
```

### Core Orchestrator

New file: `packages/workstreams/src/orchestrator.ts`

```typescript
import { exec } from "child_process"

interface RunThreadOptions {
  repoRoot: string
  streamId: string
  threadId: string
  withSummary?: boolean
  model?: string
}

export async function runThread(opts: RunThreadOptions): Promise<ThreadResult> {
  const prompt = await loadThreadPrompt(opts.repoRoot, opts.streamId, opts.threadId)

  // Execute worker agent
  const workerResult = await executeOpencode({
    prompt,
    model: opts.model ?? "anthropic/claude-sonnet-4-5",
  })

  // Mark tasks complete
  await updateThreadTasks(opts, "completed")

  // Run summarizer if requested
  if (opts.withSummary) {
    const summary = await runSummarizer(opts, workerResult)
    await saveThreadSummary(opts, summary)
    return { ...workerResult, summary }
  }

  return workerResult
}

export async function runBatch(opts: RunBatchOptions): Promise<BatchResult> {
  const threads = getThreadsInBatch(opts.repoRoot, opts.streamId, opts.batchId)

  // Run threads in parallel
  const results = await Promise.all(
    threads.map(t => runThread({ ...opts, threadId: t.id, withSummary: true }))
  )

  // Evaluate batch
  if (opts.autoEvaluate) {
    const evaluation = await runBatchEvaluator(opts, results)
    await saveBatchEvaluation(opts, evaluation)

    if (!evaluation.proceed) {
      throw new BatchBlockedError(evaluation.blockers)
    }
  }

  return { threads: results, evaluation }
}

export async function runStage(opts: RunStageOptions): Promise<StageResult> {
  const batches = getBatchesInStage(opts.repoRoot, opts.streamId, opts.stageNum)

  // Run batches sequentially (threads within each batch run in parallel)
  const results: BatchResult[] = []
  for (const batch of batches) {
    const result = await runBatch({ ...opts, batchId: batch.id, autoEvaluate: true })
    results.push(result)

    // Gate: stop if batch evaluation fails
    if (!result.evaluation.proceed) {
      return { batches: results, completed: false, stoppedAt: batch.id }
    }
  }

  return { batches: results, completed: true }
}

async function executeOpencode(opts: { prompt: string; model: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmd = `opencode run "${opts.prompt}" --model "${opts.model}"`
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}
```

### Summarizer Prompt Template

New skill: `skills/summarizing-threads/prompt.md`

```markdown
# Thread Summary Agent

You are reviewing the completed work for thread {{threadId}} in workstream {{streamId}}.

## Context
- Thread: {{threadName}}
- Tasks completed: {{taskCount}}
- Files changed: {{filesChanged}}

## Your Task
Analyze the work done and produce a structured summary:

1. **Quality Score** (1-10): Rate the implementation quality
2. **Issues Found**: List any bugs, gaps, or concerns
3. **Files Changed**: Confirm files modified
4. **Recommendation**: One of:
   - `proceed` - Work is complete and correct
   - `review` - Minor issues, human should glance
   - `block` - Significant problems, cannot continue

Output as JSON:
{
  "qualityScore": 8,
  "issuesFound": [],
  "filesChanged": ["src/foo.ts"],
  "recommendation": "proceed",
  "narrative": "Brief description of what was done..."
}
```

## Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Summarizer per thread (not per task) | Threads are the unit of coherent work; summarizing tasks would be too granular |
| Batch evaluation gates | Natural checkpoint - all parallel work must succeed before next batch |
| Sequential batches, parallel threads | Matches the existing design intent in PLAN.md structure |
| JSON output from agents | Machine-readable for automated decisions |
| Configurable thresholds | `qualityScore >= 7` to proceed, etc. stored in config |

## Implementation Phases

### Phase 1: Immediately Doable
- `work run thread` wrapping `opencode run`
- Thread prompts already generated by `work prompts`
- Basic summarizer that reads git diff + task descriptions

### Phase 2: Needs More Work
- Parallel thread execution with proper concurrency limits
- Batch evaluation logic and thresholds
- Retry/recovery for failed threads
- Dashboard/reporting for stage runs

---

## Open Questions

### 1. Summarizer Context Access
Should the summarizer have access to the full conversation log from the worker agent, or just the git diff?

- **Full log**: More context, can evaluate reasoning quality, but larger input
- **Git diff only**: Simpler, focuses on output quality, faster

### 2. Failure Mode for Batches
If one thread fails, should the batch:

- **Stop immediately**: Fail fast, save resources
- **Continue other threads, then report**: Get full picture of issues
- **Retry N times**: Self-healing, but may waste resources on persistent failures

### 3. Per-Stage Thresholds
Should evaluation thresholds be configurable per-stage?

Some stages may need higher quality (e.g., security-critical work) while others are more exploratory. Consider:

```yaml
stages:
  1:
    min_quality_score: 6
    allow_review_recommendations: true
  2:
    min_quality_score: 8
    allow_review_recommendations: false
```

### 4. Human Escalation Path
When a batch is blocked, what's the escalation flow?

- Pause and wait for human intervention?
- Create GitHub issue automatically?
- Send notification (Slack, email)?
- Rollback changes from failed threads?

### 5. Resource Management
How many parallel agents can/should run?

- Token/cost limits per stage?
- Concurrency limits (e.g., max 3 threads at once)?
- Model selection per agent type (cheaper models for summarizers)?
