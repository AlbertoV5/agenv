# Tasks: revision-workflow

## Stage 01: Core Library

### Batch 01: Hybrid Generation

#### Thread 01: Revision TASKS.md Generation @agent:systems-engineer
- [ ] Task 01.01.01.01: Add `generateTasksMdForRevision(streamName, existingTasks, doc, newStageNumbers)` function to `src/lib/tasks-md.ts`
- [ ] Task 01.01.01.02: Implement logic to output existing tasks with status markers ([x], [~], etc.) for stages NOT in newStageNumbers
- [ ] Task 01.01.01.03: Implement logic to output empty placeholders for stages IN newStageNumbers (same format as generateTasksMdFromPlan)
- [ ] Task 01.01.01.04: Ensure output is sorted by stage/batch/thread and properly formatted

#### Thread 02: New Stage Detection @agent:systems-engineer
- [ ] Task 01.01.02.01: Add `detectNewStages(doc, existingTasks)` function to `src/lib/tasks-md.ts`
- [ ] Task 01.01.02.02: Extract unique stage IDs from existingTasks using parseTaskId
- [ ] Task 01.01.02.03: Compare against doc.stages to find stages with no tasks
- [ ] Task 01.01.02.04: Return array of new stage numbers sorted ascending

## Stage 02: CLI Commands

### Batch 01: Revision Command

#### Thread 01: Work Revision CLI @agent:default
- [ ] Task 02.01.01.01: Create `src/cli/revision.ts` with parseCliArgs for `--name` and `--description` flags
- [ ] Task 02.01.01.02: Implement main() that loads index, resolves stream, calls appendRevisionStage
- [ ] Task 02.01.01.03: Output success message with stage number and next steps
- [ ] Task 02.01.01.04: Register "revision" in bin/work.ts SUBCOMMANDS

#### Thread 02: Append Revision Stage @agent:default
- [ ] Task 02.01.02.01: Add `appendRevisionStage(repoRoot, streamId, options)` function to `src/lib/fix.ts`
- [ ] Task 02.01.02.02: Create stage template with "Revision - {name}" prefix and clean structure (Definition, Constitution, Questions, Batches)
- [ ] Task 02.01.02.03: Append to PLAN.md at end (similar to appendFixStage but without targetStage reference)

### Batch 02: Approve Revision Command

#### Thread 01: Work Approve Revision CLI @agent:default
- [ ] Task 02.02.01.01: Add "revision" case handling in `src/cli/approve.ts` parseCliArgs and main
- [ ] Task 02.02.01.02: Load PLAN.md, parse with parseStreamDocument, load existing tasks from tasks.json
- [ ] Task 02.02.01.03: Call detectNewStages() and error if no new stages found
- [ ] Task 02.02.01.04: Validate new stages have no open questions (reuse checkOpenQuestions logic filtered to new stages)
- [ ] Task 02.02.01.05: Call generateTasksMdForRevision() and write TASKS.md
- [ ] Task 02.02.01.06: Output summary with existing task count, new placeholder count, and next steps

## Stage 03: Skill Update & Tests

### Batch 01: Documentation and Tests

#### Thread 01: Skill Documentation @agent:documentation-minimalist
- [ ] Task 03.01.01.01: Add "Revision Workflow" section to skills/planning-workstreams/SKILL.md after "Workflow Overview"
- [ ] Task 03.01.01.02: Document the 7-step revision flow with commands
- [ ] Task 03.01.01.03: Add `work revision` and `work approve revision` to CLI Reference section
- [ ] Task 03.01.01.04: Add example showing revision flow from user request to work continue

#### Thread 02: Tests @agent:code-reviewer
- [ ] Task 03.01.02.01: Create `tests/revision.test.ts` with test setup using temp directories
- [ ] Task 03.01.02.02: Test detectNewStages() with various scenarios (no tasks, partial tasks, all tasks)
- [ ] Task 03.01.02.03: Test generateTasksMdForRevision() produces correct hybrid output
- [ ] Task 03.01.02.04: Test appendRevisionStage() creates correct PLAN.md structure
- [ ] Task 03.01.02.05: Test CLI integration: revision command adds stage, approve revision generates TASKS.md
