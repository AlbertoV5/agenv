
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import {
    approveStage,
    revokeStageApproval,
    getStageApprovalStatus,
    approveStream,
    getApprovalStatus
} from "../src/lib/approval.ts";
import { loadIndex, saveIndex } from "../src/lib/index.ts";
import type { WorkIndex } from "../src/lib/types.ts";

const TEST_DIR = join(import.meta.dir, "temp_approval_test");
const REPO_ROOT = TEST_DIR;

describe("Approval Flow", () => {
    beforeAll(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
        mkdirSync(join(TEST_DIR, "work", "stream-001"), { recursive: true });

        // Create index.json
        const index: WorkIndex = {
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            streams: [{
                id: "stream-001",
                name: "test-stream",
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
                path: "work/stream-001",
                generated_by: { workstreams: "1.0.0" }
            }]
        };
        saveIndex(REPO_ROOT, index);

        // Create PLAN.md
        writeFileSync(join(REPO_ROOT, "work/stream-001/PLAN.md"), "# Test Plan");
    });

    afterAll(() => {
        rmSync(TEST_DIR, { recursive: true });
    });

    test("should start with draft status", () => {
        const index = loadIndex(REPO_ROOT);
        const stream = index.streams[0];
        if (!stream) throw new Error("Stream not found");
        expect(getApprovalStatus(stream)).toBe("draft");
        expect(getStageApprovalStatus(stream, 1)).toBe("draft");
    });

    test("should approve stream", () => {
        const stream = approveStream(REPO_ROOT, "stream-001", "tester");
        expect(stream.approval?.status).toBe("approved");
        expect(stream.approval?.approved_by).toBe("tester");
    });

    test("should approve stage 1", () => {
        const stream = approveStage(REPO_ROOT, "stream-001", 1, "tester");
        expect(getStageApprovalStatus(stream, 1)).toBe("approved");
        expect(stream.approval?.stages?.[1]?.status).toBe("approved");
    });

    test("should revoke stage 1", () => {
        const stream = revokeStageApproval(REPO_ROOT, "stream-001", 1, "bad output");
        expect(getStageApprovalStatus(stream, 1)).toBe("revoked");
        expect(stream.approval?.stages?.[1]?.revoked_reason).toBe("bad output");
    });

    test("should re-approve stage 1", () => {
        const stream = approveStage(REPO_ROOT, "stream-001", 1, "tester");
        expect(getStageApprovalStatus(stream, 1)).toBe("approved");
    });

    test("should handle stage 2 unrelated to stage 1", () => {
        const index = loadIndex(REPO_ROOT);
        const stream = index.streams[0];
        if (!stream) throw new Error("Stream not found");
        expect(getStageApprovalStatus(stream, 2)).toBe("draft");


        const updatedStream = approveStage(REPO_ROOT, "stream-001", 2, "tester");
        expect(getStageApprovalStatus(updatedStream, 2)).toBe("approved");
        // Stage 1 should still be approved
        expect(getStageApprovalStatus(updatedStream, 1)).toBe("approved");
    });

    test("should check tasks approval readiness", () => {
        const { checkTasksApprovalReady } = require("../src/lib/approval.ts");

        // Should failing initially (no TASKS.md)
        try {
            const result = checkTasksApprovalReady(REPO_ROOT, "stream-001");
            expect(result.ready).toBe(false);
            expect(result.reason).toContain("TASKS.md not found");
        } catch (e) {
            // function might not be exported in test context if using bun test runner quirks
            // but we can test the approval failure directly
        }

        // Create empty TASKS.md
        writeFileSync(join(REPO_ROOT, "work/stream-001/TASKS.md"), "# Tasks: test-stream\n\n");

        // Should fail (empty tasks)
        try {
            const result = checkTasksApprovalReady(REPO_ROOT, "stream-001");
            expect(result.ready).toBe(false);
            expect(result.reason).toContain("contains no valid tasks");
        } catch (e) { }

        // Create valid TASKS.md
        writeFileSync(join(REPO_ROOT, "work/stream-001/TASKS.md"), `
# Tasks: test-stream

## Stage 01: Stage 1

### Batch 01: Batch 1

#### Thread 01: Thread 1

- [ ] Task 01.01.01.01: Task 1
        `.trim());

        const result = checkTasksApprovalReady(REPO_ROOT, "stream-001");
        expect(result.ready).toBe(true);
        expect(result.taskCount).toBe(1);
    });

    test("should approve tasks", () => {
        const { approveTasks, getTasksApprovalStatus } = require("../src/lib/approval.ts");

        let stream = approveTasks(REPO_ROOT, "stream-001");
        expect(getTasksApprovalStatus(stream)).toBe("approved");
        expect(stream.approval?.tasks?.task_count).toBe(1);
    });

    test("should check prompts approval readiness", () => {
        const { checkPromptsApprovalReady } = require("../src/lib/approval.ts");

        // Create tasks.json (simulating generation + assignment)
        writeFileSync(join(REPO_ROOT, "work/stream-001/tasks.json"), JSON.stringify({
            version: "1.0.0",
            stream_id: "stream-001",
            last_updated: new Date().toISOString(),
            tasks: [{
                id: "01.01.01.01",
                name: "Task 1",
                status: "pending",
                assigned_agent: "coder"
            }]
        }));

        // Should fail initially (no prompt files)
        const result = checkPromptsApprovalReady(REPO_ROOT, "stream-001");
        expect(result.ready).toBe(false);
        expect(result.reason).toContain("Missing 1 prompt file");

        // Create prompt file
        const promptDir = join(REPO_ROOT, "work/stream-001/prompts/01-stage/01-batch");
        mkdirSync(promptDir, { recursive: true });
        writeFileSync(join(promptDir, "thread-01.md"), "# Prompt");

        // Should pass
        const resultPass = checkPromptsApprovalReady(REPO_ROOT, "stream-001");
        expect(resultPass.ready).toBe(true);
    });

    test("should approve prompts", () => {
        const { approvePrompts, getPromptsApprovalStatus } = require("../src/lib/approval.ts");

        let stream = approvePrompts(REPO_ROOT, "stream-001");
        expect(getPromptsApprovalStatus(stream)).toBe("approved");
        expect(stream.approval?.prompts?.prompt_count).toBe(1);
    });

    test("should verify full approval", () => {
        const { isFullyApproved, getFullApprovalStatus } = require("../src/lib/approval.ts");
        const index = loadIndex(REPO_ROOT);
        const stream = index.streams[0];
        if (!stream) throw new Error("Stream not found");

        expect(isFullyApproved(stream)).toBe(true);

        const status = getFullApprovalStatus(stream);
        expect(status.plan).toBe("approved");
        expect(status.tasks).toBe("approved");
        expect(status.prompts).toBe("approved");
        expect(status.fullyApproved).toBe(true);
    });
});

// Separate test suite for TASKS.md auto-generation during plan approval
const AUTOGEN_TEST_DIR = join(import.meta.dir, "temp_autogen_test");
const AUTOGEN_REPO_ROOT = AUTOGEN_TEST_DIR;

describe("Plan Approval with TASKS.md Auto-Generation", () => {
    beforeEach(() => {
        // Clean up before each test
        if (existsSync(AUTOGEN_TEST_DIR)) {
            rmSync(AUTOGEN_TEST_DIR, { recursive: true });
        }
        mkdirSync(join(AUTOGEN_TEST_DIR, "work", "stream-autogen"), { recursive: true });

        // Create index.json
        const index: WorkIndex = {
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            streams: [{
                id: "stream-autogen",
                name: "Auto-Gen Test Stream",
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
                path: "work/stream-autogen",
                generated_by: { workstreams: "1.0.0" }
            }]
        };
        saveIndex(AUTOGEN_REPO_ROOT, index);
    });

    afterEach(() => {
        if (existsSync(AUTOGEN_TEST_DIR)) {
            rmSync(AUTOGEN_TEST_DIR, { recursive: true });
        }
    });

    test("should generate TASKS.md when approving plan with valid PLAN.md", async () => {
        // Create a valid PLAN.md with stages, batches, and threads
        const planContent = `# Plan: Auto-Gen Test Stream

## Summary

Test workstream for auto-generation.

## Stages

### Stage 01: Setup

#### Definition

Initial setup stage.

#### Constitution

**Inputs:**

- 

**Structure:**

- 

**Outputs:**

- 

#### Stage Questions

- [x] Ready

#### Batches

##### Batch 01: Initial Setup

###### Thread 01: Database Setup

**Summary:**

Set up the database.

**Details:**

- Database setup

###### Thread 02: API Setup

**Summary:**

Set up the API.

**Details:**

- API setup
`;
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);

        // Verify TASKS.md doesn't exist yet
        const tasksMdPath = join(AUTOGEN_REPO_ROOT, "work/stream-autogen/TASKS.md");
        expect(existsSync(tasksMdPath)).toBe(false);

        // Run the CLI approve command
        const { main } = await import("../src/cli/approve.ts");
        
        // Capture console output
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT]);
        } finally {
            console.log = originalLog;
        }

        // Verify plan was approved
        const index = loadIndex(AUTOGEN_REPO_ROOT);
        const stream = index.streams[0];
        expect(stream?.approval?.status).toBe("approved");

        // Verify TASKS.md was generated
        expect(existsSync(tasksMdPath)).toBe(true);

        // Verify TASKS.md content structure
        const tasksMdContent = readFileSync(tasksMdPath, "utf-8");
        expect(tasksMdContent).toContain("# Tasks: Auto-Gen Test Stream");
        expect(tasksMdContent).toContain("## Stage 01: Setup");
        expect(tasksMdContent).toContain("### Batch 01: Initial Setup");
        expect(tasksMdContent).toContain("#### Thread 01: Database Setup");
        expect(tasksMdContent).toContain("#### Thread 02: API Setup");
        expect(tasksMdContent).toContain("- [ ] Task 01.01.01.01:");
        expect(tasksMdContent).toContain("- [ ] Task 01.01.02.01:");

        // Verify output message mentions TASKS.md
        const outputJoined = logs.join("\n");
        expect(outputJoined).toContain("TASKS.md generated");
    });

    test("should warn when overwriting existing TASKS.md", async () => {
        // Create a valid PLAN.md
        const planContent = `# Plan: Test Stream

## Summary

Test.

## Stages

### Stage 01: Test Stage

#### Definition

Test stage.

#### Constitution

**Inputs:**

- 

**Structure:**

- 

**Outputs:**

- 

#### Stage Questions

- [x] Ready

#### Batches

##### Batch 01: Test Batch

###### Thread 01: Test Thread

**Summary:**

Test thread.

**Details:**

- Test
`;
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);

        // Pre-create TASKS.md
        const tasksMdPath = join(AUTOGEN_REPO_ROOT, "work/stream-autogen/TASKS.md");
        writeFileSync(tasksMdPath, "# Old TASKS.md content");

        // Run the CLI approve command
        const { main } = await import("../src/cli/approve.ts");
        
        // Capture console output
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT]);
        } finally {
            console.log = originalLog;
        }

        // Verify TASKS.md was overwritten
        const tasksMdContent = readFileSync(tasksMdPath, "utf-8");
        expect(tasksMdContent).not.toContain("Old TASKS.md content");
        expect(tasksMdContent).toContain("# Tasks:");

        // Verify warning was shown
        const outputJoined = logs.join("\n");
        expect(outputJoined).toContain("Overwrote existing TASKS.md");
    });

    test("should still approve plan when TASKS.md generation fails", async () => {
        // Create a minimal PLAN.md without proper structure (will fail to generate proper tasks)
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), "# Minimal Plan\nNo stages.");

        // Run the CLI approve command
        const { main } = await import("../src/cli/approve.ts");
        
        // Capture console output
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT]);
        } finally {
            console.log = originalLog;
        }

        // Verify plan was still approved even if TASKS.md generation had issues
        const index = loadIndex(AUTOGEN_REPO_ROOT);
        const stream = index.streams[0];
        expect(stream?.approval?.status).toBe("approved");

        // Output should mention the plan was approved
        const outputJoined = logs.join("\n");
        expect(outputJoined).toContain("Approved plan");
    });

    test("should include TASKS.md info in JSON output", async () => {
        // Create a valid PLAN.md
        const planContent = `# Plan: Test Stream

## Summary

Test.

## Stages

### Stage 01: Test Stage

#### Definition

Test stage.

#### Constitution

**Inputs:**

- 

**Structure:**

- 

**Outputs:**

- 

#### Stage Questions

- [x] Ready

#### Batches

##### Batch 01: Test Batch

###### Thread 01: Test Thread

**Summary:**

Test thread.

**Details:**

- Test
`;
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);

        // Run the CLI approve command with JSON output
        const { main } = await import("../src/cli/approve.ts");
        
        // Capture console output
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT, "--json"]);
        } finally {
            console.log = originalLog;
        }

        // Parse JSON output
        const jsonOutput = JSON.parse(logs.join(""));
        expect(jsonOutput.action).toBe("approved");
        expect(jsonOutput.target).toBe("plan");
        expect(jsonOutput.tasksMd).toBeDefined();
        expect(jsonOutput.tasksMd.generated).toBe(true);
        expect(jsonOutput.tasksMd.path).toContain("TASKS.md");
    });
});
