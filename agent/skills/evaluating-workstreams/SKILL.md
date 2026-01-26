---
name: evaluating-workstreams
description: How to document workstream results and next steps.
---

# Evaluating Workstreams

This skill guides you through evaluating the progress of a workstream and documenting the results in `REPORT.md`.

## 1. Understand Status

Before evaluating, understand the current state of the workstream.

```bash
work status              # Shows plan status and progress
work tree                # Tree view of plan tasks status
```

## 2. Review Implementation

Compare the initial plan with the actual implementation.

```bash
work review plan         # Prints the entire PLAN.md
work review commits      # Show commits (use --stage N for specific stage)
```

**Actions:**
- **Verify Scope**: Did the changes match the plan?
- **Check Quality**: Are there tests? Types? Documentation?
- **Identify Issues**: Any bugs, hacks, or incomplete features?

## 3. Generate Report Template

The evaluation is documented in `REPORT.md`. Generate the template:

```bash
work report init
```

*If the command is not available, create `REPORT.md` manually using the structure below.*

## 4. Fill Report Sections

Edit `REPORT.md` to provide a comprehensive evaluation.

### Summary
**Goal**: High-level overview for stakeholders.
- **Content**: What was the main achievement? Was it successful?
- **Example**: "Refactored the API layer to use Hono. Improved error handling and added validation middleware. All tests passing."

### Accomplishments
**Goal**: Detailed breakdown by stage.
- **Per Stage**:
  - **Description**: Brief summary of the stage's work.
  - **Key Changes**: List of specific technical changes (new components, schema updates, etc.).

**Example**:
```md
### Stage 01: API Setup
Implemented the base Hono server structure.
#### Key Changes
- Added `src/server.ts` entry point
- configured `zod` for validation
```

### File References
**Goal**: Map changes to files for easy review.
- **Table**: List important files and what changed in them.

**Example**:
| File | Changes |
|------|---------|
| `src/routes/auth.ts` | Added login/register endpoints |
| `prisma/schema.prisma` | Added User model |

### Issues & Blockers
**Goal**: Honest assessment of problems.
- **Content**: Bugs found, technical debt introduced, or external blockers.
- **Example**: "The auth middleware currently mocks the token verification. Needs integration with Auth0."

### Next Steps
**Goal**: Guide the next iteration.
- **Content**: What should happen next? (e.g., "Implement real auth", "Add integration tests").

## 5. Documentation (`docs/`)

For complex changes that require more than a summary:

- **Create files in `docs/`**: e.g., `docs/api-architecture.md`, `docs/migration-guide.md`.
- **Link them in REPORT.md**: "See `docs/api-architecture.md` for details."
- **Use for**: Diagrams (Mermaid), deep dives, decision records (ADRs).

## 6. Validate Report

Ensure your report is complete before finishing:

```bash
work report validate
```

## 7. Complete Evaluation

Once `REPORT.md` is complete and validated, the evaluation is done. Present the report summary to the user and ask if they have any questions or want changes.

The `REPORT.md` file now serves as the permanent record of what was accomplished and what comes next.

