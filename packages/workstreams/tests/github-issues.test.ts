import { describe, it, expect } from "bun:test";
import { formatIssueTitle, formatIssueBody, type CreateThreadIssueInput } from "../src/lib/github/issues";

describe("formatIssueTitle", () => {
  it("formats the title correctly", () => {
    const title = formatIssueTitle("02", "01", "01", "Thread Name", "stream-name");
    expect(title).toBe("[02.01.01] Thread Name - stream-name");
  });
});

describe("formatIssueBody", () => {
  it("formats the body correctly", () => {
    const input: CreateThreadIssueInput = {
      summary: "This is a summary",
      details: "These are details",
      streamId: "001-stream",
      streamName: "Stream Name",
      stageName: "Stage Name",
      batchName: "Batch Name"
    };
    const body = formatIssueBody(input);
    expect(body).toContain("**Workstream:** Stream Name (`001-stream`)");
    expect(body).toContain("**Stage:** Stage Name");
    expect(body).toContain("**Batch:** Batch Name");
    expect(body).toContain("## Summary\nThis is a summary");
    expect(body).toContain("## Details\nThese are details");
  });
});
