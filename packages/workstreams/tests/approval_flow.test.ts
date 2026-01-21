
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "fs";
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
});
