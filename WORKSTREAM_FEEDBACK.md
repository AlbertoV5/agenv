# Workstream Planning Feedback

Observations and suggestions from using the workstream planning system.

## Session Context

- **Date:** 2026-01-20
- **Task:** Planning web visualization feature for workstreams package
- **Agent:** Claude Opus 4.5 via Claude Code

---

## What Worked Well

### 1. Hierarchical Structure
The Stage → Batch → Thread → Task hierarchy maps naturally to parallelizable work. Stages enforce sequential dependencies, while threads within a batch can run concurrently.

### 2. CLI Workflow
- `work create --stages N` scaffolds a complete structure
- `work preview` provides a clear overview
- `work consolidate` validates structure before approval
- The commands are discoverable and well-documented

### 3. Separation of Plan and Tasks
PLAN.md holds the design/intent, tasks.json tracks execution. This separation is clean.

---

## Friction Points

### ~~1. Question Resolution Parser Bug~~ FIXED

**Problem:** Marked questions as resolved with `[x]` but they still showed as "open":
```markdown
- [x] Use Bun native server vs Express/Hono? (Decided: Bun native)
```

**Root Cause:** The `marked` lexer parses task list items and sets `item.checked` property, but strips the `[x]` from `item.text`. The parser was trying to regex-match `[x]` in the text where it no longer existed.

**Fix Applied:** Modified `stream-parser.ts` to use `item.task` and `item.checked` properties from marked instead of parsing the checkbox from text.

```typescript
// Before: tried to parse [x] from text (already stripped by marked)
const items = list.items.map((item) => item.text.trim())

// After: use marked's task list properties
const questionItems = list.items.map((item) => {
  if (item.task) {
    const prefix = item.checked ? "[x]" : "[ ]"
    return `${prefix} ${item.text.trim()}`
  }
  return item.text.trim()
})
```

### 2. Task Creation Workflow Unclear

**Problem:** After approval, the workflow to add tasks wasn't clear:
- Should tasks be derived automatically from Thread summaries?
- Should each thread get exactly one task, or multiple?
- What granularity is expected?

**Suggestion:**
- Add `work add-tasks-from-threads` command that auto-generates one task per thread
- Or document the expected task granularity in SKILL.md
- Clarify: "Each thread typically becomes 1-3 tasks"

### 3. Constitution Template Too Rigid

**Problem:** The Constitution section has enforced sub-structure:
```markdown
**Inputs:**
- <!-- What feeds into this stage -->

**Structure:**
- <!-- Internal planning... -->

**Outputs:**
- <!-- What this stage produces -->
```

This is verbose and not always needed. For simple stages, it's overkill.

**Suggestion:** Make Constitution a free-form section with guidance:
```markdown
#### Stage Constitution

Describe how this stage operates: what it needs (inputs), how it's organized (structure), and what it produces (outputs).
```

This lets agents write naturally while covering the key points.

### 4. Agent Handoff Not Documented

**Problem:** The skill mentions specialized agents receive work, but doesn't explain:
- How does a planning agent hand off to implementation agents?
- What format do implementation agents expect?
- How do agents report back completion?

**Suggestion:** Add a section to SKILL.md on agent handoff:
```markdown
## Agent Handoff

### For Planning Agents
After approval, generate execution prompts:
  work prompt --stage 1 --batch 1 --thread 1

### For Implementation Agents
Receive thread context via `work prompt`, execute, then:
  work update --task "01.01.01.01" --status completed
```

---

## Suggestions for Implementation

### ~~Priority 1: Fix Question Parser~~ DONE
- File: `src/lib/stream-parser.ts`
- Use marked's `item.task` and `item.checked` properties instead of regex parsing

### Priority 2: Simplify Constitution
- File: `src/lib/generate.ts` (template generation)
- Remove inner structure, use guidance comment instead

### Priority 3: Auto-Task Generation
- New command: `work generate-tasks` or flag on consolidate
- Creates one task per thread using thread summary as task name

### Priority 4: Improve SKILL Documentation
- Add "Expected Workflow" section with numbered steps
- Add "Agent Handoff" section
- Add examples of good vs over-structured plans

---

## Ideas for Future

### 1. Plan Validation Levels
- `--strict`: All sections must be filled, no open questions
- `--minimal`: Just needs stages and threads named
- Default: Current behavior

### 2. Thread Templates
Pre-defined thread types for common patterns:
- `--type test` → Thread with test-writing context
- `--type api` → Thread with API endpoint context
- `--type refactor` → Thread with refactoring checklist

### 3. Progress Dashboard (This Workstream!)
The web visualization we're planning would help with:
- Seeing overall progress across workstreams
- Identifying blocked threads
- Tracking agent assignments

### 4. Workstream Inheritance
For related features, inherit structure from a parent:
```bash
work create --name "feature-v2" --from "000-feature-v1"
```

---

## Summary

The workstream system has a solid foundation. Main areas for improvement:

1. ~~**Parser robustness** - Handle edge cases in markdown parsing~~ FIXED (question parser)
2. **Workflow clarity** - Document the full plan → tasks → execute → report cycle
3. **Flexibility** - Allow simpler plans without losing structure for complex ones
4. **Agent integration** - Make handoff between planning and implementation agents seamless

The Constitution simplification and better SKILL docs would have the highest immediate impact on usability.

---

## Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-01-20 | Fixed question parser to use marked's task list properties | `src/lib/stream-parser.ts` |
| 2026-01-20 | Made `--stages` required in `work create` | `src/cli/create.ts` |
