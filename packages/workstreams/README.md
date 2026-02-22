# @agenv/workstreams

Workstream management library and CLI.

## Install

```bash
npm install -g @agenv/workstreams
# or
bun install -g @agenv/workstreams
```

## Quick Start

```bash
work init
work create --name "my-feature" --stages 2
work current --set "001-my-feature"
work validate plan
work check plan
```

## Core Workflow

1. Create and edit `PLAN.md`
2. Approve plan: `work approve plan` (user role)
3. Assign agents to threads: `work assign --thread "01.01.01" --agent "default"`
4. Execute batches: `work multi --batch "01.01"`
5. Update thread progress via `work update --thread "01.01.01" --status completed --report "..."`
6. Finalize report and complete stream:
   - `work report validate`
   - `work complete`

## Useful Commands

```bash
work status
work tree
work list --threads
work read --thread "01.01.01"
work update --thread "01.01.01" --status in_progress
work update --thread "01.01.01" --status completed --report "Implemented X"
work report metrics --blockers
work export --format json
```

## OpenCode Subagent Manual Verification

Use this prompt-driven acceptance check instead of automated smoke tests:

```bash
Ask the planner to run exactly one Task-tool subagent and write:
  /tmp/subagent-smoke-output.txt -> subagent-smoke-ok

Then verify from shell:
  test -f /tmp/subagent-smoke-output.txt && cat /tmp/subagent-smoke-output.txt
```

Expected output:
- `subagent-smoke-ok`
