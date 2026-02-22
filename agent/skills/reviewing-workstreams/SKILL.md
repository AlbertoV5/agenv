---
name: reviewing-workstreams
description: Review workstream plans for structure, risks, and readiness.
---

# Reviewing Workstreams

## Review Steps

1. Inspect plan:
   - `work review plan`
   - `work preview`
2. Validate:
   - `work validate plan`
   - `work check plan`
3. Check quality:
   - threads in each batch are truly parallelizable (no shared-file collisions unless explicitly serialized)
   - inter-thread dependencies are correct and minimal (only required edges)
   - every thread includes concrete file paths it will edit
   - thread ordering (parallel vs serial) is justified by those file overlaps/dependencies
   - clear scope per thread
   - explicit inputs/outputs
   - no unresolved blocking questions

## Output

- Provide concrete findings.
- Call out blockers first.
- Suggest exact edits, not general advice.
- For each issue, include precise PLAN.md fixes (batch/thread move, dependency update, or file-path additions).
