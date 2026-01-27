# Workstream Reports

The `REPORT.md` file is the standardized way to document the results, accomplishments, and next steps of a workstream. It serves as a permanent record of what was done and helps with future planning and reviews.

## Workflow

1.  **Initialize**: If `REPORT.md` doesn't exist, generate it from the workstream metadata.
    ```bash
    work report init
    ```
2.  **Document**: Fill in the required sections in `REPORT.md` (Summary, Accomplishments, etc.).
3.  **Validate**: Ensure the report is complete and follows the required structure.
    ```bash
    work report validate
    ```
4.  **Complete**: The `work complete` command will check for a valid `REPORT.md` before finalizing the workstream.

## Report Structure

### 1. Summary
A high-level overview for stakeholders. Focus on the "what" and "why". Explain the primary goal achieved by this workstream.

### 2. Accomplishments
Break down the work by stage.
-   **Stage ID**: e.g., "Stage 01"
-   **Description**: Brief summary of the stage's purpose.
-   **Key Changes**: Bullet points of technical details, implemented features, or refactoring.

### 3. File References
A table mapping key files to changes. This helps reviewers understand the scope of impact.

| File | Changes |
|------|---------|
| `src/app.ts` | Server setup and middleware configuration |
| `packages/core/src/types.ts` | Added `AuthPayload` interface |

### 4. Issues & Blockers
An honest assessment of any problems, technical debt, bugs, or incomplete items.
-   **Integration issues**: Problems with external services or other parts of the system.
-   **Testing gaps**: Flaky tests or areas not fully covered.
-   **Performance concerns**: Identified bottlenecks.

### 5. Next Steps
Actionable items for the next iteration or follow-up workstreams. Use this to inform the planning of future work.

## Additional Documentation

For complex changes that require deep dives (architecture, migration guides, decision records), create separate files in the `docs/` directory.

-   **Location**: `docs/` inside the workstream directory.
-   **Naming**: `docs/topic-name.md`
-   **Linking**: Reference these docs in your `REPORT.md` summary or accomplishments.
