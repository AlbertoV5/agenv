---
name: evaluating-workstream-outputs
description: How to analyze workstream metrics, identify blockers, and filter tasks. Use for understanding progress and identifying issues.
---

# Evaluating Workstream Outputs

## Quick Metrics

```bash
work metrics                          # Current workstream
work metrics --stream "001-my-stream" # Specific workstream
work metrics --all                    # All workstreams aggregate
```

## Task Filtering

```bash
# By name pattern
work metrics --filter "api"
work metrics --filter "test.*endpoint" --regex

# By status
work metrics --filter-status blocked
work metrics --filter-status in_progress,blocked
```

## Blocker Analysis

```bash
work metrics --blockers               # All blocked tasks with context
```

Shows blocked tasks grouped by stage.

## Output Formats

```bash
work metrics --json                   # Machine-readable
work metrics --compact                # Single-line summary
```

## What You Get

| Metric | Description |
|--------|-------------|
| Total Tasks | Count of all tasks |
| Completion Rate | % completed |
| Blocked Rate | % blocked |
| In Progress | Active tasks |

## CLI Summary

```bash
# Quick check
work metrics
work metrics --all

# Filter tasks
work metrics --filter "pattern"
work metrics --filter-status blocked

# Deep analysis
work metrics --blockers

# Output
work metrics --json
work metrics --compact
```

## Related Skills

- `/implementing-workstream-plans` - Work on identified issues
- `/documenting-workstream-outputs` - Generate reports from metrics
