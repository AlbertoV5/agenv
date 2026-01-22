# Completion: revision-workflow

**Stream ID:** `006-revision-workflow`
**Completed At:** 2026-01-22T22:15:56.888Z

## Accomplishments

### CLI Commands

#### Approve Revision Command

**Thread: Work Approve Revision CLI**
- ✓ Add "revision" case handling in `src/cli/approve.ts` parseCliArgs and main
  > Added 'revision' to ApproveTarget type, updated help text, parseCliArgs to handle 'revision' subcommand, and added case in main switch. Added imports for detectNewStages and generateTasksMdForRevision.
- ✓ Load PLAN.md, parse with parseStreamDocument, load existing tasks from tasks.json
  > Implemented handleRevisionApproval function that loads PLAN.md, parses with parseStreamDocument, and loads existing tasks from tasks.json using getTasks.
- ✓ Call detectNewStages() and error if no new stages found
  > Added call to detectNewStages() and error exit with message 'No new stages to approve' if no new stages found.
- ✓ Validate new stages have no open questions (reuse checkOpenQuestions logic filtered to new stages)
  > Added validation to check open questions in new stages using checkOpenQuestions, filtering results to only new stages, with --force option support.
- ✓ Call generateTasksMdForRevision() and write TASKS.md
  > Called generateTasksMdForRevision() with stream name, existing tasks, parsed doc, and new stage numbers, then wrote result to TASKS.md using atomicWriteFile.
- ✓ Output summary with existing task count, new placeholder count, and next steps
  > Added output summary showing existing task count, new placeholder count (calculated from new stages), new stage list, and next steps message. Supports both --json and text output formats.

#### Revision Command

**Thread: Append Revision Stage**
- ✓ Add `appendRevisionStage(repoRoot, streamId, options)` function to `src/lib/fix.ts`
  > Added appendRevisionStage function and RevisionStageOptions interface to src/lib/fix.ts
- ✓ Create stage template with "Revision - {name}" prefix and clean structure (Definition, Constitution, Questions, Batches)
  > Created stage template with 'Revision - {name}' prefix including Definition, Constitution, Questions, and Batches sections
- ✓ Append to PLAN.md at end (similar to appendFixStage but without targetStage reference)
  > Implemented append to PLAN.md at end without targetStage reference, similar to appendFixStage

**Thread: Work Revision CLI**
- ✓ Create `src/cli/revision.ts` with parseCliArgs for `--name` and `--description` flags
  > Created src/cli/revision.ts with parseCliArgs handling --name and --description flags
- ✓ Implement main() that loads index, resolves stream, calls appendRevisionStage
  > Implemented main() in revision.ts with index loading, stream resolution, and appendRevisionStage call
- ✓ Output success message with stage number and next steps
  > Added success output showing stage number and next steps message about editing PLAN.md and running approve
- ✓ Register "revision" in bin/work.ts SUBCOMMANDS
  > Registered revision command in bin/work.ts SUBCOMMANDS with import statement

### Core Library

#### Hybrid Generation

**Thread: New Stage Detection**
- ✓ Add `detectNewStages(doc, existingTasks)` function to `src/lib/tasks-md.ts`
  > Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.
- ✓ Extract unique stage IDs from existingTasks using parseTaskId
  > Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.
- ✓ Compare against doc.stages to find stages with no tasks
  > Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.
- ✓ Return array of new stage numbers sorted ascending
  > Added detectNewStages(doc, existingTasks) function to tasks-md.ts. Uses parseTaskId to extract stage IDs from existing tasks, compares against doc.stages, returns sorted array of new stage numbers. Added 6 comprehensive tests.

**Thread: Revision TASKS.md Generation**
- ✓ Add `generateTasksMdForRevision(streamName, existingTasks, doc, newStageNumbers)` function to `src/lib/tasks-md.ts`
  > Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.
- ✓ Implement logic to output existing tasks with status markers ([x], [~], etc.) for stages NOT in newStageNumbers
  > Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.
- ✓ Implement logic to output empty placeholders for stages IN newStageNumbers (same format as generateTasksMdFromPlan)
  > Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.
- ✓ Ensure output is sorted by stage/batch/thread and properly formatted
  > Added generateTasksMdForRevision() to tasks-md.ts. Function preserves existing task statuses ([x], [~], etc.) for stages not in newStageNumbers, generates empty placeholders for new stages, and sorts output by stage/batch/thread.

### Revision - TASKS.md cleanup

#### Investigation and Fix

**Thread: Debug TASKS.md Deletion**
- ✓ Add console.log in deleteTasksMd() to verify if function is called and what path it uses
  > Fixed issue where TASKS.md was not deleted if tasks were already approved. Modified handleTasksApproval to ensure cleanup happens even on subsequent runs.
- ✓ Check if deleteTasksMd() is being called in handleTasksApproval() when tasks are already approved (early return at line 742)
  > Fixed issue where TASKS.md was not deleted if tasks were already approved. Modified handleTasksApproval to ensure cleanup happens even on subsequent runs.
- ✓ Investigate if handleRevisionApproval() or other code paths recreate TASKS.md after deletion
  > Fixed issue where TASKS.md was not deleted if tasks were already approved. Modified handleTasksApproval to ensure cleanup happens even on subsequent runs.
- ✓ Fix the issue - ensure TASKS.md is deleted after successful task serialization
  > Fixed issue where TASKS.md was not deleted if tasks were already approved. Modified handleTasksApproval to ensure cleanup happens even on subsequent runs.
- ✓ Remove debug logging and verify fix works by running `work approve tasks` on a test workstream
  > Fixed issue where TASKS.md was not deleted if tasks were already approved. Modified handleTasksApproval to ensure cleanup happens even on subsequent runs.

### Skill Update & Tests

#### Documentation and Tests

**Thread: Skill Documentation**
- ✓ Add "Revision Workflow" section to skills/planning-workstreams/SKILL.md after "Workflow Overview"
  > Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.
- ✓ Document the 7-step revision flow with commands
  > Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.
- ✓ Add `work revision` and `work approve revision` to CLI Reference section
  > Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.
- ✓ Add example showing revision flow from user request to work continue
  > Updated skills/planning-workstreams/SKILL.md with new Revision Workflow section, including 7-step flow, example, and CLI reference updates.

**Thread: Tests**
- ✓ Create `tests/revision.test.ts` with test setup using temp directories
- ✓ Test detectNewStages() with various scenarios (no tasks, partial tasks, all tasks)
- ✓ Test generateTasksMdForRevision() produces correct hybrid output
- ✓ Test appendRevisionStage() creates correct PLAN.md structure
- ✓ Test CLI integration: revision command adds stage, approve revision generates TASKS.md

## Key Insights
- (Add insights and learnings here)

## File References
_No files found in the output directory._

## Metrics
- **Tasks:** 35/35 completed
- **Stages:** 4
- **Batches:** 5
- **Threads:** 8
- **Completion Rate:** 100.0%
- **Status Breakdown:**
  - Completed: 35
  - In Progress: 0
  - Pending: 0
  - Blocked: 0
  - Cancelled: 0
