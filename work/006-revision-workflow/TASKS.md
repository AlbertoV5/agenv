# Tasks: revision-workflow

## Stage 01: Core Library

### Batch 01: Hybrid Generation

#### Thread 01: Revision TASKS.md Generation @agent:systems-engineer
- [x] Task 01.01.01.01: Add `generateTasksMdForRevision(streamName, existingTasks, doc, newStageNumbers)` function to `src/lib/tasks-md.ts`
  > Report: Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.
- [x] Task 01.01.01.02: Implement logic to output existing tasks with status markers ([x], [~], etc.) for stages NOT in newStageNumbers
  > Report: Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.
- [x] Task 01.01.01.03: Implement logic to output empty placeholders for stages IN newStageNumbers (same format as generateTasksMdFromPlan)
  > Report: Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.
- [x] Task 01.01.01.04: Ensure output is sorted by stage/batch/thread and properly formatted
  > Report: Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.

#### Thread 02: New Stage Detection @agent:systems-engineer
- [x] Task 01.01.02.01: Add `detectNewStages(doc, existingTasks)` function to `src/lib/tasks-md.ts`
  > Report: Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.
- [x] Task 01.01.02.02: Extract unique stage IDs from existingTasks using parseTaskId
  > Report: Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.
- [x] Task 01.01.02.03: Compare against doc.stages to find stages with no tasks
  > Report: Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.
- [x] Task 01.01.02.04: Return array of new stage numbers sorted ascending
  > Report: Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.

## Stage 02: CLI Commands

### Batch 01: Revision Command

#### Thread 01: Work Revision CLI @agent:default
- [x] Task 02.01.01.01: Create `src/cli/revision.ts` with parseCliArgs for `--name` and `--description` flags
  > Report: Created src/cli/revision.ts with parseCliArgs handling --name and --description flags
- [x] Task 02.01.01.02: Implement main() that loads index, resolves stream, calls appendRevisionStage
  > Report: Implemented main() in revision.ts with index loading, stream resolution, and appendRevisionStage call
- [x] Task 02.01.01.03: Output success message with stage number and next steps
  > Report: Added success output showing stage number and next steps message about editing PLAN.md and running approve
- [x] Task 02.01.01.04: Register "revision" in bin/work.ts SUBCOMMANDS
  > Report: Registered revision command in bin/work.ts SUBCOMMANDS with import statement

#### Thread 02: Append Revision Stage @agent:default
- [x] Task 02.01.02.01: Add `appendRevisionStage(repoRoot, streamId, options)` function to `src/lib/fix.ts`
  > Report: Added appendRevisionStage function and RevisionStageOptions interface to src/lib/fix.ts
- [x] Task 02.01.02.02: Create stage template with "Revision - {name}" prefix and clean structure (Definition, Constitution, Questions, Batches)
  > Report: Created stage template with 'Revision - {name}' prefix including Definition, Constitution, Questions, and Batches sections
- [x] Task 02.01.02.03: Append to PLAN.md at end (similar to appendFixStage but without targetStage reference)
  > Report: Implemented append to PLAN.md at end without targetStage reference, similar to appendFixStage

### Batch 02: Approve Revision Command

#### Thread 01: Work Approve Revision CLI @agent:default
- [x] Task 02.02.01.01: Add "revision" case handling in `src/cli/approve.ts` parseCliArgs and main
  > Report: Added 'revision' to ApproveTarget type, updated help text, parseCliArgs to handle 'revision' subcommand, and added case in main switch. Added imports for detectNewStages and generateTasksMdForRevision.
- [x] Task 02.02.01.02: Load PLAN.md, parse with parseStreamDocument, load existing tasks from tasks.json
  > Report: Implemented handleRevisionApproval function that loads PLAN.md, parses with parseStreamDocument, and loads existing tasks from tasks.json using getTasks.
- [x] Task 02.02.01.03: Call detectNewStages() and error if no new stages found
  > Report: Added call to detectNewStages() and error exit with message 'No new stages to approve' if no new stages found.
- [x] Task 02.02.01.04: Validate new stages have no open questions (reuse checkOpenQuestions logic filtered to new stages)
  > Report: Added validation to check open questions in new stages using checkOpenQuestions, filtering results to only new stages, with --force option support.
- [x] Task 02.02.01.05: Call generateTasksMdForRevision() and write TASKS.md
  > Report: Called generateTasksMdForRevision() with stream name, existing tasks, parsed doc, and new stage numbers, then wrote result to TASKS.md using atomicWriteFile.
- [x] Task 02.02.01.06: Output summary with existing task count, new placeholder count, and next steps
  > Report: Added output summary showing existing task count, new placeholder count (calculated from new stages), new stage list, and next steps message. Supports both --json and text output formats.

## Stage 03: Skill Update & Tests

### Batch 01: Documentation and Tests

#### Thread 01: Skill Documentation @agent:documentation-minimalist
- [x] Task 03.01.01.01: Add "Revision Workflow" section to skills/planning-workstreams/SKILL.md after "Workflow Overview"
  > Report: Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.
- [x] Task 03.01.01.02: Document the 7-step revision flow with commands
  > Report: Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.
- [x] Task 03.01.01.03: Add `work revision` and `work approve revision` to CLI Reference section
  > Report: Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.
- [x] Task 03.01.01.04: Add example showing revision flow from user request to work continue
  > Report: Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.

#### Thread 02: Tests @agent:code-reviewer
- [x] Task 03.01.02.01: Create `tests/revision.test.ts` with test setup using temp directories
- [x] Task 03.01.02.02: Test detectNewStages() with various scenarios (no tasks, partial tasks, all tasks)
- [x] Task 03.01.02.03: Test generateTasksMdForRevision() produces correct hybrid output
- [x] Task 03.01.02.04: Test appendRevisionStage() creates correct PLAN.md structure
- [x] Task 03.01.02.05: Test CLI integration: revision command adds stage, approve revision generates TASKS.md

## Stage 04: Revision - TASKS.md cleanup

### Batch 01: Investigation and Fix

#### Thread 01: Debug TASKS.md Deletion @agent:code-reviewer
- [ ] Task 04.01.01.01: Add console.log in deleteTasksMd() to verify if function is called and what path it uses
- [ ] Task 04.01.01.02: Check if deleteTasksMd() is being called in handleTasksApproval() when tasks are already approved (early return at line 742)
- [ ] Task 04.01.01.03: Investigate if handleRevisionApproval() or other code paths recreate TASKS.md after deletion
- [ ] Task 04.01.01.04: Fix the issue - ensure TASKS.md is deleted after successful task serialization
- [ ] Task 04.01.01.05: Remove debug logging and verify fix works by running `work approve tasks` on a test workstream 
