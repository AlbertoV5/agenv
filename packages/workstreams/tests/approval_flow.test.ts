
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { createTestWorkstream, cleanupTestWorkstream, type TestWorkspace } from "./helpers/test-workspace.ts";
import { captureCliOutput } from "./helpers/cli-runner.ts";
import {
    approveStage,
    revokeStageApproval,
    getStageApprovalStatus,
    approveStream,
    getApprovalStatus
} from "../src/lib/approval.ts";
import { loadIndex, saveIndex } from "../src/lib/index.ts";
import type { WorkIndex } from "../src/lib/types.ts";

describe("Approval Flow", () => {
    let workspace: TestWorkspace;
    let REPO_ROOT: string;

    beforeAll(() => {
        // Set USER role for approval tests
        process.env.WORKSTREAM_ROLE = "USER";
        
        workspace = createTestWorkstream("stream-001");
        REPO_ROOT = workspace.repoRoot;

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
        cleanupTestWorkstream(workspace);
        // Clean up role setting
        delete process.env.WORKSTREAM_ROLE;
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

    test("should verify full approval", () => {
        const { isFullyApproved, getFullApprovalStatus } = require("../src/lib/approval.ts");
        const index = loadIndex(REPO_ROOT);
        const stream = index.streams[0];
        if (!stream) throw new Error("Stream not found");

        expect(isFullyApproved(stream)).toBe(true);

        const status = getFullApprovalStatus(stream);
        expect(status.plan).toBe("approved");
        expect(status.tasks).toBe("draft");
        expect(status.fullyApproved).toBe(true);
    });

    test("work approve tasks is a deprecated compatibility shim", async () => {
        const tasksPath = join(REPO_ROOT, "work/stream-001/tasks.json");
        writeFileSync(tasksPath, JSON.stringify({
            version: "1.0.0",
            stream_id: "stream-001",
            last_updated: new Date().toISOString(),
            tasks: [{
                id: "01.01.01.01",
                name: "Legacy task",
                thread_name: "Thread One",
                batch_name: "Batch One",
                stage_name: "Stage One",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: "pending"
            }]
        }, null, 2));

        const { main } = await import("../src/cli/approve/index.ts");
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "tasks", "--stream", "stream-001", "--repo-root", REPO_ROOT]);
        });

        const output = stdout.join("\n");
        expect(output).toContain("deprecated");
        expect(output).toContain("work approve plan");
        expect(existsSync(join(REPO_ROOT, "work/stream-001/threads.json"))).toBe(true);
    });
});

// Separate test suite for threads.json sync during plan approval
describe("Plan Approval with threads.json Sync", () => {
    let workspace: TestWorkspace;
    let AUTOGEN_REPO_ROOT: string;

    beforeEach(() => {
        // Set USER role for approval tests
        process.env.WORKSTREAM_ROLE = "USER";
        
        workspace = createTestWorkstream("stream-autogen");
        AUTOGEN_REPO_ROOT = workspace.repoRoot;

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
        cleanupTestWorkstream(workspace);
        // Clean up role setting
        delete process.env.WORKSTREAM_ROLE;
    });

    test("should sync threads.json when approving plan with valid PLAN.md", async () => {
        // Create a valid PLAN.md from fixture
        const planContent = readFileSync(join(import.meta.dir, "fixtures/plans/basic-plan.md"), "utf-8");
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);

        const threadsPath = join(AUTOGEN_REPO_ROOT, "work/stream-autogen/threads.json");
        expect(existsSync(threadsPath)).toBe(false);

        // Run the CLI approve command
        const { main } = await import("../src/cli/approve/index.ts");

        // Capture console output
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT]);
        });

        // Verify plan was approved
        const index = loadIndex(AUTOGEN_REPO_ROOT);
        const stream = index.streams[0];
        expect(stream?.approval?.status).toBe("approved");

        // Verify threads.json was generated and populated
        expect(existsSync(threadsPath)).toBe(true);
        const threadsJson = JSON.parse(readFileSync(threadsPath, "utf-8"));
        expect(Array.isArray(threadsJson.threads)).toBe(true);
        expect(threadsJson.threads.length).toBeGreaterThan(0);

        // Verify output message mentions thread sync
        const outputJoined = stdout.join("\n");
        expect(outputJoined).toContain("threads.json synced");
    });

    test("should merge when threads.json already exists", async () => {
        // Create a valid PLAN.md from fixture
        const planContent = readFileSync(join(import.meta.dir, "fixtures/plans/multi-batch-plan.md"), "utf-8");
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);

        // Pre-create threads.json with one manual assignment
        const threadsPath = join(AUTOGEN_REPO_ROOT, "work/stream-autogen/threads.json");
        writeFileSync(threadsPath, JSON.stringify({
            version: "1.0.0",
            stream_id: "stream-autogen",
            last_updated: new Date().toISOString(),
            threads: [{ threadId: "01.01.01", threadName: "Thread One", stageName: "Stage One", batchName: "Batch One", status: "pending", assignedAgent: "coder", sessions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        }, null, 2));

        // Run the CLI approve command
        const { main } = await import("../src/cli/approve/index.ts");

        // Capture console output
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT]);
        });

        // Verify pre-existing assignment is preserved
        const threadsJson = JSON.parse(readFileSync(threadsPath, "utf-8"));
        const first = threadsJson.threads.find((t: any) => t.threadId === "01.01.01");
        expect(first?.assignedAgent).toBe("coder");

        const outputJoined = stdout.join("\n");
        expect(outputJoined).toContain("threads.json synced");
    });

    test("should still approve plan when thread sync fails", async () => {
        // Create a minimal PLAN.md without proper structure (will fail to generate proper tasks)
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), "# Minimal Plan\nNo stages.");

        // Run the CLI approve command
        const { main } = await import("../src/cli/approve/index.ts");

        // Capture console output
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT]);
        });

        // Verify plan was still approved even if thread sync had issues
        const index = loadIndex(AUTOGEN_REPO_ROOT);
        const stream = index.streams[0];
        expect(stream?.approval?.status).toBe("approved");

        // Output should mention the plan was approved
        const outputJoined = stdout.join("\n");
        expect(outputJoined).toContain("Approved plan");
    });

    test("should include threads sync info in JSON output", async () => {
        // Create a valid PLAN.md from fixture
        const planContent = readFileSync(join(import.meta.dir, "fixtures/plans/multi-batch-plan.md"), "utf-8");
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);

        // Run the CLI approve command with JSON output
        const { main } = await import("../src/cli/approve/index.ts");

        // Capture console output
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT, "--json"]);
        });

        // Parse JSON output
        const jsonOutput = JSON.parse(stdout.join(""));
        expect(jsonOutput.action).toBe("approved");
        expect(jsonOutput.target).toBe("plan");
        expect(jsonOutput.threads).toBeDefined();
        expect(jsonOutput.threads.synced).toBe(true);
        expect(jsonOutput.threads.threadCount).toBeGreaterThan(0);
    });

    test("should auto-migrate legacy tasks.json during plan approval", async () => {
        const planContent = readFileSync(join(import.meta.dir, "fixtures/plans/basic-plan.md"), "utf-8");
        writeFileSync(join(AUTOGEN_REPO_ROOT, "work/stream-autogen/PLAN.md"), planContent);
        const tasksPath = join(AUTOGEN_REPO_ROOT, "work/stream-autogen/tasks.json");
        writeFileSync(tasksPath, JSON.stringify({
            version: "1.0.0",
            stream_id: "stream-autogen",
            last_updated: new Date().toISOString(),
            tasks: [{
                id: "01.01.01.01",
                name: "Legacy task",
                thread_name: "Parser",
                batch_name: "Core",
                stage_name: "Build",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: "pending"
            }]
        }, null, 2));

        const { main } = await import("../src/cli/approve/index.ts");
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "plan", "--stream", "stream-autogen", "--repo-root", AUTOGEN_REPO_ROOT, "--json"]);
        });

        const jsonOutput = JSON.parse(stdout.join(""));
        expect(jsonOutput.migration).toBeDefined();
        expect(jsonOutput.migration.tasksJsonFound).toBe(true);
        expect(jsonOutput.migration.taskCount).toBe(1);
        expect(jsonOutput.migration.backupPath).toBeDefined();
    });
});

// Separate test suite for tasks approval with auto-generation of tasks.json and prompts
describe("Tasks Approval Compatibility", () => {
    let workspace: TestWorkspace;
    let TASKS_APPROVAL_REPO_ROOT: string;

    beforeEach(() => {
        // Set USER role for approval tests
        process.env.WORKSTREAM_ROLE = "USER";
        
        workspace = createTestWorkstream("stream-tasks");
        TASKS_APPROVAL_REPO_ROOT = workspace.repoRoot;

        // Create index.json
        const index: WorkIndex = {
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            streams: [{
                id: "stream-tasks",
                name: "Tasks Test Stream",
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
                path: "work/stream-tasks",
                generated_by: { workstreams: "1.0.0" },
                approval: { status: "approved" } // Plan is already approved
            }]
        };
        saveIndex(TASKS_APPROVAL_REPO_ROOT, index);

        // Create PLAN.md (needed for prompt generation)
        const planContent = readFileSync(join(import.meta.dir, "fixtures/plans/revision-plan.md"), "utf-8");
        writeFileSync(join(TASKS_APPROVAL_REPO_ROOT, "work/stream-tasks/PLAN.md"), planContent);
    });

    afterEach(() => {
        cleanupTestWorkstream(workspace);
        // Clean up role setting
        delete process.env.WORKSTREAM_ROLE;
    });

    test("work approve tasks migrates legacy tasks.json and returns deprecation JSON", async () => {
        const tasksJsonPath = join(TASKS_APPROVAL_REPO_ROOT, "work/stream-tasks/tasks.json");
        writeFileSync(tasksJsonPath, JSON.stringify({
            version: "1.0.0",
            stream_id: "stream-tasks",
            last_updated: new Date().toISOString(),
            tasks: [
                {
                    id: "01.01.01.01",
                    name: "Legacy Task",
                    thread_name: "Feature A",
                    batch_name: "Core Features",
                    stage_name: "Implementation",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    status: "pending"
                }
            ]
        }, null, 2));

        const { main } = await import("../src/cli/approve/index.ts");
        const { stdout } = await captureCliOutput(async () => {
            await main(["node", "approve", "tasks", "--stream", "stream-tasks", "--repo-root", TASKS_APPROVAL_REPO_ROOT, "--json"]);
        });

        const jsonOutput = JSON.parse(stdout.join(""));
        expect(jsonOutput.action).toBe("deprecated");
        expect(jsonOutput.target).toBe("tasks");
        expect(jsonOutput.migration.tasksJsonFound).toBe(true);
        expect(existsSync(join(TASKS_APPROVAL_REPO_ROOT, "work/stream-tasks/threads.json"))).toBe(true);
    });

    test("work approve tasks --revoke is rejected with deprecation guidance", async () => {
        const { main } = await import("../src/cli/approve/index.ts");

        const originalExit = process.exit;
        let exitCode: number | undefined;
        // @ts-ignore
        process.exit = (code?: number) => {
            exitCode = code ?? 0;
            throw new Error(`Process exited with code ${code}`);
        };

        let stderr: string[] = [];
        try {
            const captured = await captureCliOutput(async () => {
                try {
                    await main(["node", "approve", "tasks", "--revoke", "--stream", "stream-tasks", "--repo-root", TASKS_APPROVAL_REPO_ROOT]);
                } catch {
                    // expected due to mocked process.exit
                }
            });
            stderr = captured.stderr;
        } finally {
            process.exit = originalExit;
        }

        expect(exitCode).toBe(1);
        const output = stderr.join("\n");
        expect(output).toContain("no longer supported");
        expect(output).toContain("deprecated");
    });
});
