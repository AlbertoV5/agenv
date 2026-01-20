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

### 4. Workstream Inheritance
For related features, inherit structure from a parent:
```bash
work create --name "feature-v2" --from "000-feature-v1"
```