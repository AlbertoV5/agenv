import { describe, it, expect, mock } from "bun:test";

// Mocks must be defined before imports
mock.module("../src/lib/github/config", () => ({
  isGitHubEnabled: async () => true,
  loadGitHubConfig: async () => ({ owner: "owner", repo: "repo", enabled: true }),
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
});

describe("closeThreadIssue", () => {
  it("closes an issue", async () => {
    await closeThreadIssue("/root", "stream1", 123);
    expect(mockCloseIssue).toHaveBeenCalledWith(123);
  });
});

describe("storeThreadIssueMeta", () => {
  it("stores issue meta in tasks file", () => {
    storeThreadIssueMeta("/root", "stream1", "task1", { issue_number: 99, issue_url: "url" });
    expect(mockWriteTasksFile).toHaveBeenCalled();
    const [repoRoot, streamId, file] = mockWriteTasksFile.mock.calls[0];
    expect(file.tasks[0].github_issue).toEqual({ number: 99, url: "url", state: "open" });
  });
});
