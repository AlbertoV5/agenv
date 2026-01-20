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

## Notes

- Make so TASKS.md doesn't include index, just `- [ ] Task description`
- Add review command, `review plan` for printing the current plan's PLAN.md and `review tasks` for printing the current plan's TASKS.md
- Add prompt templates to top-level agent, "use x skill, your role is of"
- Make so prompt generation creates PROMPTS.md file to review.

## Human Workflow notes

- PLAN: Ask for feature and to create plan (iterate).
- REVIEW: Ask to review and edit PLAN.md and to ask questions if any (iterate).
- PLAN: Ask for TASKS.md generation.
- REVIEW: Ask to revew and edit TASKS.md if any (iterate).
- PLAN: Ask for TASKS.md serialization and assignements.
- USER: Review tasks.
- PLAN: Ask for prompts generation.