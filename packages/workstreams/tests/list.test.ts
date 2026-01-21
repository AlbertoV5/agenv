import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { main } from "../src/cli/list";
import { createEmptyTasksFile, writeTasksFile } from "../src/lib/tasks";
import type { Task } from "../src/lib/types";

// Mock console.log and console.error
const originalLog = console.log;
const originalError = console.error;
let logOutput: string[] = [];
let errorOutput: string[] = [];

function mockConsole() {
    logOutput = [];
    errorOutput = [];
    console.log = (msg: string) => logOutput.push(msg);
    console.error = (msg: string) => errorOutput.push(msg);
}

function restoreConsole() {
    console.log = originalLog;
    console.error = originalError;
}

const TEST_DIR = join(import.meta.dir, "temp_list_test");
const REPO_ROOT = join(TEST_DIR, "repo");
const WORK_DIR = join(REPO_ROOT, "work");
const STREAM_ID = "001-test-stream";

describe("CLI: List Tasks with Filtering", () => {
    beforeEach(() => {
        mockConsole();
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
        mkdirSync(WORK_DIR, { recursive: true });

        // Create index.json
        writeFileSync(
            join(WORK_DIR, "index.json"),
            JSON.stringify({
                streams: [
                    {
                        id: STREAM_ID,
                        name: "Test Stream",
                        status: "active",
                        relativePath: STREAM_ID,
                    },
                ],
            })
        );

        // Create tasks.json with sample tasks
        const tasksFile = createEmptyTasksFile(STREAM_ID);
        const tasks: Task[] = [
            {
                id: "01.01.01.01",
                name: "Task 1",
                status: "pending",
                stage_name: "Stage 1",
                batch_name: "Batch 1",
                thread_name: "Thread 1",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: "01.01.02.01",
                name: "Task 2",
                status: "in_progress",
                stage_name: "Stage 1",
                batch_name: "Batch 1",
                thread_name: "Thread 2",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: "01.02.01.01",
                name: "Task 3 (Batch 2)",
                status: "pending",
                stage_name: "Stage 1",
                batch_name: "Batch 2",
                thread_name: "Thread 1 of Batch 2",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: "02.01.01.01",
                name: "Task 4 (Stage 2)",
                status: "pending",
                stage_name: "Stage 2",
                batch_name: "Batch 1",
                thread_name: "Thread 1",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];
        tasksFile.tasks = tasks;

        mkdirSync(join(WORK_DIR, STREAM_ID), { recursive: true });
        writeTasksFile(REPO_ROOT, STREAM_ID, tasksFile);
    });

    afterEach(() => {
        restoreConsole();
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
    });

    test("should list all tasks when no filters provided", () => {
        main(["node", "work", "list", "--repo-root", REPO_ROOT, "--stream", STREAM_ID, "--json"]);
        const output = JSON.parse(logOutput[0] || "[]");
        expect(output.length).toBe(4);
    });

    test("should filter by stage", () => {
        main([
            "node", "work", "list",
            "--repo-root", REPO_ROOT,
            "--stream", STREAM_ID,
            "--stage", "1",
            "--json"
        ]);
        const output = JSON.parse(logOutput[0] || "[]");
        expect(output.length).toBe(3);
        expect(output.every((t: any) => t.id.startsWith("01."))).toBe(true);
    });

    test("should filter by batch", () => {
        main([
            "node", "work", "list",
            "--repo-root", REPO_ROOT,
            "--stream", STREAM_ID,
            "--batch", "01.01",
            "--json"
        ]);
        const output = JSON.parse(logOutput[0] || "[]");
        expect(output.length).toBe(2);
        expect(output.every((t: any) => t.id.startsWith("01.01."))).toBe(true);
    });

    test("should filter by thread", () => {
        main([
            "node", "work", "list",
            "--repo-root", REPO_ROOT,
            "--stream", STREAM_ID,
            "--thread", "01.01.02",
            "--json"
        ]);
        const output = JSON.parse(logOutput[0] || "[]");
        expect(output.length).toBe(1);
        expect(output[0].id).toBe("01.01.02.01");
    });

    test("should return empty list if no tasks match filter", () => {
        main([
            "node", "work", "list",
            "--repo-root", REPO_ROOT,
            "--stream", STREAM_ID,
            "--batch", "99.99",
            "--json"
        ]);
        // When no tasks found with json flag, it should log empty array or handle gracefully in main

        expect(logOutput[0] || "").toContain("No tasks found");
    });
});
