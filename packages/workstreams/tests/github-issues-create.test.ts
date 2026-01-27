import { describe, it, expect, mock } from "bun:test";

// Mocks must be defined before imports
mock.module("../src/lib/github/config", () => ({
  isGitHubEnabled: async () => true,
  loadGitHubConfig: async () => ({ 
    owner: "owner", 
    repo: "repo", 
    enabled: true,
    label_config: {
      workstream: { prefix: "stream:", color: "0366d6" },
      stage: { prefix: "stage:", color: "0e8a16" },
      batch: { prefix: "batch:", color: "fbca04" }
    }
  }),
}));

mock.module("../src/lib/github/labels", () => ({
  getThreadLabels: () => ["stream:Stream", "stage:01-Stage", "batch:01-Batch"],
}));

mock.module("../src/lib/github/auth", () => ({
  getGitHubAuth: () => "fake-token",
}));

const mockCreateIssue = mock(() => Promise.resolve({ number: 123, html_url: "http://url" }));
const mockCloseIssue = mock(() => Promise.resolve({}));

mock.module("../src/lib/github/client", () => ({
  createGitHubClient: () => ({
    createIssue: mockCreateIssue,
    closeIssue: mockCloseIssue
  }),
}));

const mockWriteTasksFile = mock(() => {});
mock.module("../src/lib/tasks", () => ({
  readTasksFile: () => ({
    tasks: [{ id: "task1", status: "pending" }]
  }),
  writeTasksFile: mockWriteTasksFile
}));

import { createThreadIssue, closeThreadIssue, storeThreadIssueMeta, type CreateThreadIssueInput } from "../src/lib/github/issues";

describe("createThreadIssue", () => {
  it("creates an issue and returns meta", async () => {
    const input: CreateThreadIssueInput = {
      summary: "Summary",
      details: "Details",
      streamId: "stream1",
      streamName: "Stream",
      stageId: "01",
      stageName: "Stage",
      batchId: "01",
      batchName: "Batch",
      threadId: "01",
      threadName: "Thread"
    };

    const result = await createThreadIssue("/root", input);

    expect(result).toEqual({ issue_number: 123, issue_url: "http://url" });
    expect(mockCreateIssue).toHaveBeenCalled();
  });

  it("passes labels to createIssue", async () => {
    mockCreateIssue.mockClear();
    
    const input: CreateThreadIssueInput = {
      summary: "Summary",
      details: "Details",
      streamId: "stream1",
      streamName: "Stream",
      stageId: "01",
      stageName: "Stage",
      batchId: "01",
      batchName: "Batch",
      threadId: "01",
      threadName: "Thread"
    };

    await createThreadIssue("/root", input);

    const call = mockCreateIssue.mock.calls[0] as unknown[];
    const labels = call[2] as string[];
    expect(labels).toEqual(["stream:Stream", "stage:01-Stage", "batch:01-Batch"]);
  });
});

describe("closeThreadIssue", () => {
  it("closes an issue", async () => {
    await closeThreadIssue("/root", "stream1", 123);
    expect(mockCloseIssue).toHaveBeenCalledWith(123);
  });
});

describe("storeThreadIssueMeta (deprecated)", () => {
  it("is a no-op (issue metadata now stored in github.json per-stage)", () => {
    // storeThreadIssueMeta is now a no-op - issue metadata moved to github.json per-stage
    storeThreadIssueMeta("/root", "stream1", "task1", { issue_number: 99, issue_url: "url" });
    // Should NOT write to tasks file anymore
    expect(mockWriteTasksFile).not.toHaveBeenCalled();
  });
});
