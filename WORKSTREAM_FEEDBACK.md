# Workstream Planning Feedback

Observations and suggestions from using the workstream planning system.

## Friction Points

### ~~2. Task Creation Workflow Unclear~~ DOCUMENTED

**Problem:** After approval, the workflow to add tasks wasn't clear:
- Should tasks be derived automatically from Thread summaries?
- Should each thread get exactly one task, or multiple?
- What granularity is expected?

**Finding:** Two workflows actually exist but weren't documented:

1. **TASKS.md Workflow** (batch creation):
   ```bash
   work tasks generate    # Creates TASKS.md with placeholders from PLAN.md
   # Edit TASKS.md to fill in task descriptions
   work tasks serialize   # Converts to tasks.json, deletes TASKS.md
   ```

2. **Direct Workflow** (one-by-one):
   ```bash
   work add-task --stage 1 --batch 1 --thread 1 --name "Task description"
   ```

**Implementation found:** `src/lib/tasks-md.ts` and `src/cli/tasks.ts` fully implement the TASKS.md workflow with status markers (`[ ]`, `[x]`, `[~]`, `[!]`, `[-]`).

**Fix Applied:** Updated WORKSTREAM.md Section 1.4 to document both workflows with examples.

**TODO: Update WORKSTREAM.md to enforce required workflow order:**

The TASKS.md workflow MUST be the required path after plan approval:

1. `work tasks generate` — Create TASKS.md from approved PLAN.md
2. Edit TASKS.md — Fill in task descriptions for all threads
3. `work tasks serialize` — Convert to tasks.json (deletes TASKS.md)
4. `work add-task` — Only for additional tasks discovered during execution

This ensures:
- All threads have tasks defined upfront
- Planner reviews full task structure before execution begins
- Direct add-task is reserved for mid-execution additions only

**Files to update:**
- `WORKSTREAM.md` Section 1.4 — Change from "Option A/B" to required sequence
- `skills/create-workstream-plans/SKILL.md` — Enforce TASKS.md workflow in planning skill

### 5. AGENTS.md and TESTS.md Not Documented in Skills

**Problem:** Two important configuration files are supported but not mentioned in SKILL docs:

**AGENTS.md** (at `work/AGENTS.md`):
- Defines available agents for workstream execution
- Used by `work prompt` to include agent context in execution prompts
- Used by `work assign` to assign agents to threads

Expected format:
```markdown
# Agents

## Agent Definitions

### backend-expert
**Description:** Specializes in database schema, ORM, migrations
**Best for:** Database setup, complex queries
**Model:** claude-opus

### frontend-specialist
**Description:** Focuses on UI components, styling
**Best for:** Component refactors, style fixes
**Model:** claude-sonnet
```

CLI commands:
```bash
work agents                    # List all agents
work agents --add --name "..." --description "..." --best-for "..." --model "..."
work agents --remove "name"
```

**TESTS.md** (at `work/TESTS.md`):
- Defines test requirements included in agent execution prompts
- Loaded by `work prompt` (can exclude with `--no-tests`)

Expected format:
```markdown
# Tests

## General
- All changes must pass existing test suite
- New functionality requires unit tests
- Integration tests for API changes

## Per-Stage
- Stage 1: Schema changes require migration tests
- Stage 2: API endpoints need request/response tests
```

**Suggestion:** Add these to the planning skill documentation so planning agents know to:
1. Create AGENTS.md if specialized agents are needed
2. Create TESTS.md with test requirements for implementation agents
3. Use `work assign` to map agents to threads before generating prompts

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

### ~~Priority 4: Improve SKILL Documentation~~ DONE
- Added "Workflow Overview" with 8-step planning scope
- Added "Handoff to User" section
- Clarified Constitution as free-form guidance

### Priority 5: Document AGENTS.md and TESTS.md in Skills
- Add section explaining AGENTS.md format and `work agents` commands
- Add section explaining TESTS.md format
- Show how `work assign` maps agents to threads
- Mention these in the workflow: create before generating prompts

---

### 5. Work Init Command

**Problem:** The `work/` directory requires `AGENTS.md` and `TESTS.md` configuration files, but there's no command to initialize them. Users must manually create these files or discover their format through documentation.

**Suggestion:** Add `work init` command to bootstrap the work directory:

```bash
work init                    # Initialize work/ with default config files
work init --force            # Overwrite existing files
```

Creates:
```
work/
├── index.json               # Empty workstream registry
├── AGENTS.md                # Default agent definitions template
└── TESTS.md                 # Default test requirements template
```

Default AGENTS.md template:
```markdown
# Agents

## Agent Definitions

### default
**Description:** General-purpose implementation agent
**Best for:** Standard development tasks
**Model:** claude-sonnet
```

Default TESTS.md template:
```markdown
# Test Requirements

## General
- All changes must pass existing test suite
- New functionality requires tests

## Per-Stage
- (Add stage-specific test requirements here)
```

**Benefits:**
- Clear entry point for new repositories
- Ensures consistent configuration file format
- Reduces friction for first-time setup

---

## Summary (edited)

The workstream system has a solid foundation. Main areas for improvement:

3. **Flexibility** - Allow simpler plans without losing structure for complex ones
6. **Task creation workflow order** - TASKS.md must be required, not optional (see TODO in #2)

Remaining priorities:
- **Enforce TASKS.md workflow** — Update WORKSTREAM.md and skills to require: generate → serialize → then add-task only for additions
- **Skills update** — Reference AGENTS.md/TESTS.md in planning skill
- **Add `work init` command** — Bootstrap work/ directory with AGENTS.md, TESTS.md, and index.json
