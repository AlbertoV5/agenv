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
3. Fill `TASKS.md`
4. Approve tasks: `work approve tasks` (user role)
5. Execute batches: `work multi --batch "01.01"`
6. Complete tasks with reports via `work update --status completed --report "..."`
7. Finalize report and complete stream:
   - `work report validate`
   - `work complete`

## Useful Commands

```bash
work status
work tree
work list --tasks
work update --task "01.01.01.01" --status in_progress
work update --task "01.01.01.01" --status completed --report "Implemented X"
work report metrics --blockers
work export --format json
```
