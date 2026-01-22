
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { loadIndex, saveIndex } from "../src/lib/index.ts";
import type { WorkIndex, Task, StreamDocument } from "../src/lib/types.ts";
import { detectNewStages, generateTasksMdForRevision } from "../src/lib/tasks-md.ts";
import { appendRevisionStage } from "../src/lib/fix.ts";

const TEST_DIR = join(import.meta.dir, "temp_revision_test");
const REPO_ROOT = TEST_DIR;

describe("Revision Workflow", () => {
    beforeEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
        mkdirSync(join(TEST_DIR, "work", "stream-rev"), { recursive: true });

        // Create index.json
        const index: WorkIndex = {
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            streams: [{
                id: "stream-rev",
                name: "Revision Test Stream",
                order: 1,
                size: "short",
                session_estimated: {
                    length: 2,
                    unit: "session",
                    session_minutes: [30, 45],
                    session_iterations: [4, 8]
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                path: "work/stream-rev",
                generated_by: { workstreams: "1.0.0" },
                approval: { 
                    status: "approved",
                    tasks: { status: "approved", task_count: 1 }
                }
            }]
        };
        saveIndex(REPO_ROOT, index);
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
    });


    describe("detectNewStages()", () => {
        test("should identify stages without tasks", () => {
            // Mock StreamDocument with 3 stages
            const doc: StreamDocument = {
                streamName: "Test Stream",
                summary: "Test Summary",
                references: [],
                stages: [
                    { 
                        id: 1, 
                        name: "Stage 1", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    },
                    { 
                        id: 2, 
                        name: "Stage 2", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    },
                    { 
                        id: 3, 
                        name: "Stage 3", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    }
                ]
            };

            // Existing tasks only for Stage 1
            const tasks: Task[] = [
                {
                    id: "01.01.01.01",
                    name: "Task 1",
                    stage_name: "Stage 1",
                    batch_name: "Batch 1",
                    thread_name: "Thread 1",
                    status: "completed",
                    created_at: "",
                    updated_at: ""
                }
            ];

            const newStages = detectNewStages(doc, tasks);
            expect(newStages).toEqual([2, 3]);
        });

        test("should return empty array if all stages have tasks", () => {
            const doc: StreamDocument = {
                streamName: "Test Stream",
                summary: "Test Summary",
                references: [],
                stages: [
                    { 
                        id: 1, 
                        name: "Stage 1", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    },
                    { 
                        id: 2, 
                        name: "Stage 2", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    }
                ]
            };

            const tasks: Task[] = [
                { id: "01.01.01.01", name: "T1", stage_name: "S1", batch_name: "B1", thread_name: "T1", status: "completed", created_at: "", updated_at: "" },
                { id: "02.01.01.01", name: "T2", stage_name: "S2", batch_name: "B1", thread_name: "T1", status: "pending", created_at: "", updated_at: "" }
            ];

            const newStages = detectNewStages(doc, tasks);
            expect(newStages).toEqual([]);
        });

        test("should return all stages if no tasks exist", () => {
            const doc: StreamDocument = {
                streamName: "Test Stream",
                summary: "Test Summary",
                references: [],
                stages: [
                    { 
                        id: 1, 
                        name: "Stage 1", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    },
                    { 
                        id: 2, 
                        name: "Stage 2", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [] 
                    }
                ]
            };

            const newStages = detectNewStages(doc, []);
            expect(newStages).toEqual([1, 2]);
        });
    });

    describe("generateTasksMdForRevision()", () => {
        test("should produce hybrid output with existing tasks and new placeholders", () => {
            const doc: StreamDocument = {
                streamName: "Test Stream",
                summary: "Test Summary",
                references: [],
                stages: [
                    { 
                        id: 1, 
                        name: "Existing Stage", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [
                            { 
                                id: 1, 
                                prefix: "01", 
                                name: "Existing Batch", 
                                summary: "Sum",
                                threads: [
                                    { 
                                        id: 1, 
                                        name: "Existing Thread",
                                        summary: "Sum",
                                        details: "Det"
                                    }
                                ]
                            }
                        ]
                    },
                    { 
                        id: 2, 
                        name: "New Stage", 
                        definition: "Def",
                        constitution: "Const",
                        questions: [],
                        batches: [
                            { 
                                id: 1, 
                                prefix: "01", 
                                name: "New Batch", 
                                summary: "Sum",
                                threads: [
                                    { 
                                        id: 1, 
                                        name: "New Thread",
                                        summary: "Sum",
                                        details: "Det"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const existingTasks: Task[] = [
                {
                    id: "01.01.01.01",
                    name: "Done Task",
                    stage_name: "Existing Stage",
                    batch_name: "Existing Batch",
                    thread_name: "Existing Thread",
                    status: "completed",
                    created_at: "",
                    updated_at: ""
                }
            ];

            const newStageNumbers = [2];

            const output = generateTasksMdForRevision("Test Stream", existingTasks, doc, newStageNumbers);

            // Check existing task preservation
            expect(output).toContain("## Stage 01: Existing Stage");
            expect(output).toContain("- [x] Task 01.01.01.01: Done Task");

            // Check new stage generation
            expect(output).toContain("## Stage 02: New Stage");
            expect(output).toContain("### Batch 01: New Batch");
            expect(output).toContain("#### Thread 01: New Thread");
            expect(output).toContain("- [ ] Task 02.01.01.01:");
        });
    });

    describe("appendRevisionStage()", () => {
        test("should append new stage to PLAN.md", () => {
            // Setup initial PLAN.md
            const planPath = join(REPO_ROOT, "work/stream-rev/PLAN.md");
            const planContent = `# Plan: Revision Test Stream

## Summary
Stream summary.

## Stages

### Stage 01: Initial

#### Definition
Stage definition.

#### Constitution
Stage constitution.

#### Questions
- [ ] Question 1

#### Batches
##### Batch 01: Initial Batch
###### Thread 01: Initial Thread
**Summary:**
Thread summary.
**Details:**
Thread details.
`;
            writeFileSync(planPath, planContent);

            const result = appendRevisionStage(REPO_ROOT, "stream-rev", {
                name: "Review Changes",
                description: "Fixing bugs."
            });

            if (!result.success) {
                console.error("appendRevisionStage failed:", result.message);
            }
            expect(result.success).toBe(true);
            expect(result.newStageNumber).toBe(2);

            const content = readFileSync(planPath, "utf-8");
            expect(content).toContain("### Stage 02: Revision - Review Changes");
            expect(content).toContain("Fixing bugs.");
            expect(content).toContain("##### Batch 01: Review Changes");
        });
    });

    describe("CLI Integration", () => {
        test("should add revision stage via CLI", async () => {
            // Setup initial PLAN.md
            const planPath = join(REPO_ROOT, "work/stream-rev/PLAN.md");
            const planContent = `# Plan: Revision Test Stream

## Summary
Stream summary.

## Stages

### Stage 01: Initial

#### Definition
Stage definition.

#### Constitution
Stage constitution.

#### Questions
- [ ] Question 1

#### Batches
##### Batch 01: Initial Batch
###### Thread 01: Initial Thread
**Summary:**
Thread summary.
**Details:**
Thread details.
`;
            writeFileSync(planPath, planContent);

            // Import CLI
            const { main } = await import("../src/cli/revision.ts");

            // Capture logs
            const logs: string[] = [];
            const originalLog = console.log;
            console.log = (...args) => logs.push(args.join(" "));

            try {
                await main(["node", "revision", "--name", "CLI Test", "--stream", "stream-rev", "--repo-root", REPO_ROOT]);
            } finally {
                console.log = originalLog;
            }

            const content = readFileSync(planPath, "utf-8");
            expect(content).toContain("Revision - CLI Test");
            
            const output = logs.join("\n");
            expect(output).toContain("Added Stage 2");
        });
    });
});
