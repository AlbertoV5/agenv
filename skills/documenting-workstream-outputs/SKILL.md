---
name: documenting-workstream-outputs
description: How to generate reports, changelogs, and exports from workstreams. Use for communication and archival.
---

# Documenting Workstream Outputs

## Progress Report

```bash
work report                           # Current workstream
work report --stream "001-my-stream"  # Specific workstream
work report --all                     # All workstreams
work report --output report.md        # Write to file
```

Generates markdown with:
- Summary table (completion %, blocked, etc.)
- Stage-by-stage breakdown

## Changelog

```bash
work changelog                        # All completed tasks
work changelog --since-days 7         # Last 7 days
work changelog --since "2026-01-01"   # Since date
work changelog --output CHANGELOG.md  # Write to file
```

Lists completed tasks grouped by date.

## Export Formats

```bash
# Markdown summary
work export --format md
work export --format md --output summary.md

# CSV for spreadsheets
work export --format csv
work export --format csv --output tasks.csv

# JSON (full data)
work export --format json
```

## JSON Output

All commands support `--json` for machine-readable output:

```bash
work report --json
work changelog --json
```

## CLI Summary

```bash
# Reports
work report
work report --all --output report.md

# Changelog
work changelog
work changelog --since-days 7 --output CHANGELOG.md

# Export
work export --format md
work export --format csv
work export --format json
```

## Related Skills

- `/evaluating-workstream-outputs` - Analyze metrics before documenting
- `/implementing-workstream-plans` - Continue work on tasks
