---
name: evaluating-workstreams
description: How to document workstream results and next steps.
---

# Evaluating Workstreams

This skill guides you through evaluating the progress of a workstream and documenting the results in `REPORT.md`.

## Workflow Overview

1. `work status` - Check completion status
2. `work review commits` - Review all changes
3. Fill `REPORT.md` - Document findings
4. Add docs - Create extra documentation in `docs/` if needed
5. `work report validate` - Validate the report

## 1. Check Status

First, understand the current state of the workstream.

```bash
work status             # Shows plan status and progress
work tree               # Tree view of plan tasks status
```

## 2. Review Changes

Review the code changes to understand what was implemented vs what was planned.

```bash
work review commits      # Show all commits in the workstream
work review plan         # Reference the original plan
```

**What to look for:**
- **Scope Accuracy**: Did the changes match the plan?
- **Code Quality**: Are there tests, types, and comments?
- **Completeness**: Are any features missing or incomplete?

## 3. Fill REPORT.md

The evaluation is documented in `REPORT.md`. If it doesn't exist, run `work report init`.

### Required Sections

#### Summary
A high-level overview for stakeholders. Focus on the "what" and "why".

#### Accomplishments
Break down work by stage.
- **Stage ID**: e.g., "Stage 01"
- **Description**: Brief summary.
- **Key Changes**: Bullet points of technical details.

#### File References
A table mapping key files to changes.

#### Issues & Blockers
Honest assessment of any problems, technical debt, or bugs.

#### Next Steps
Actionable items for the next iteration.

### Example REPORT.md Content

```markdown
# Workstream Report

## Summary
Successfully implemented the new Authentication API using Hono. The system now supports JWT-based login and registration, replacing the legacy express handlers. All planned endpoints are functional and tested.

## Accomplishments

### Stage 01: Core Setup
Initialized the Hono server and configured middleware.
#### Key Changes
- Installed `hono` and `@hono/node-server`
- Created `src/app.ts` entry point
- Configured Global Error Handler

### Stage 02: Auth Endpoints
Implemented login and register routes.
#### Key Changes
- Added `POST /api/auth/login`
- Added `POST /api/auth/register`
- Implemented Zod validation schemas in `src/validators/auth.ts`

## File References
| File | Changes |
|------|---------|
| `src/app.ts` | Server setup and middleware configuration |
| `src/routes/auth.ts` | New authentication route handlers |
| `packages/core/src/types.ts` | Added `AuthPayload` interface |

## Issues & Blockers
- **Integration**: The user profile service is mocked; needs integration in the next workstream.
- **Testing**: E2E tests are flaky on CI due to timeout issues.

## Next Steps
- Integrate with User Profile Service
- Fix flaky E2E tests
- Add rate limiting middleware
```

## 4. Additional Documentation

For complex changes that require deep dives (architecture, migration guides, decision records), create separate files in the `docs/` directory.

- **Naming**: `docs/topic-name.md`
- **Linking**: Reference these docs in your `REPORT.md` summary or accomplishments.

## 5. Validate Report

Ensure your report follows the correct format and contains all required sections.

```bash
work report validate
```

If validation fails, fix the issues reported by the tool and try again.

## Troubleshooting

### Common Issues

**`work report validate` fails with "Missing section"**
- **Cause**: You might have deleted a header or typoed a section title.
- **Fix**: Ensure `## Summary`, `## Accomplishments`, etc., are exactly as shown in the example.

**`work review commits` shows too many unrelated commits**
- **Cause**: The workstream might have been long-running or branched incorrectly.
- **Fix**: Use `git log --oneline --graph` to manually inspect the history, or check specific files with `git diff origin/main...HEAD -- path/to/file`.

**Unsure what to put in "Next Steps"**
- **Tip**: Look at the original plan for any descope items, or check `TODO` comments left in the code.
