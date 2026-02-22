/**
 * Test: approveStream should preserve stage approvals
 * 
 * This test verifies that calling approveStream() does not wipe out
 * existing stage approvals.
 */

import { describe, test, expect } from "bun:test"
import { join } from "path"
import { writeFileSync } from "fs"
import { createTestWorkstream, cleanupTestWorkstream, type TestWorkspace } from "./helpers/test-workspace.ts"
import { saveIndex, loadIndex } from "../src/lib/index.ts"
import { approveStage, approveStream, getStageApprovalStatus } from "../src/lib/approval.ts"
import type { WorkIndex } from "../src/lib/types.ts"

describe("approveStream should preserve stage approvals", () => {
  function setupWorkspace(streamId: string): TestWorkspace {
    const workspace = createTestWorkstream(streamId)
    const repoRoot = workspace.repoRoot

    const index: WorkIndex = {
      version: "1.0.0",
      last_updated: new Date().toISOString(),
      current_stream: streamId,
      streams: [{
        id: streamId,
        name: "test-stream",
        order: 1,
        size: "short",
        session_estimated: {
          length: 2,
          unit: "session",
          session_minutes: [30, 45],
          session_iterations: [4, 8],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        path: `work/${streamId}`,
        generated_by: { workstreams: "1.0.0" },
      }],
    }
    saveIndex(repoRoot, index)

    writeFileSync(join(repoRoot, `work/${streamId}/PLAN.md`), "# Test Plan\n\nSome content")
    return workspace
  }

  test("approveStream should NOT wipe out existing stage approvals", () => {
    const streamId = "001-preserve-stages"
    const workspace = setupWorkspace(streamId)
    const repoRoot = workspace.repoRoot
    try {
    // First, approve stage 1
    approveStage(repoRoot, streamId, 1, "tester")
    
    // Verify stage 1 is approved
    let index = loadIndex(repoRoot)
    let stream = index.streams[0]!
    expect(getStageApprovalStatus(stream, 1)).toBe("approved")
    expect(stream.approval?.stages?.[1]?.approved_by).toBe("tester")
    
    // Also approve stage 2
    approveStage(repoRoot, streamId, 2, "tester")
    
    // Verify both stages are approved
    index = loadIndex(repoRoot)
    stream = index.streams[0]!
    expect(getStageApprovalStatus(stream, 1)).toBe("approved")
    expect(getStageApprovalStatus(stream, 2)).toBe("approved")
    
    // Now call approveStream (this re-approves the plan)
    approveStream(repoRoot, streamId, "admin")
    
    // Reload and verify that stage approvals are STILL present
    index = loadIndex(repoRoot)
    stream = index.streams[0]!
    
    // The plan should now be approved
    expect(stream.approval?.status).toBe("approved")
    expect(stream.approval?.approved_by).toBe("admin")
    
    // BUG: These stage approvals should NOT be wiped out!
    expect(getStageApprovalStatus(stream, 1)).toBe("approved")
    expect(getStageApprovalStatus(stream, 2)).toBe("approved")
    expect(stream.approval?.stages?.[1]?.approved_by).toBe("tester")
    expect(stream.approval?.stages?.[2]?.approved_by).toBe("tester")
    } finally {
      cleanupTestWorkstream(workspace)
    }
  })

  test("approveStream should preserve tasks approval too", () => {
    const streamId = "001-preserve-tasks"
    const workspace = setupWorkspace(streamId)
    const repoRoot = workspace.repoRoot
    try {
    // First, approve the stream (plan)
    approveStream(repoRoot, streamId, "admin")
    
    // Manually set tasks approval in the index
    let index = loadIndex(repoRoot)
    let stream = index.streams[0]!
    stream.approval!.tasks = {
      status: "approved",
      approved_at: new Date().toISOString(),
      task_count: 5
    }
    saveIndex(repoRoot, index)
    
    // Verify tasks approval is set
    index = loadIndex(repoRoot)
    stream = index.streams[0]!
    expect(stream.approval?.tasks?.status).toBe("approved")
    expect(stream.approval?.tasks?.task_count).toBe(5)
    
    // Now modify PLAN.md and re-approve
    writeFileSync(
      join(repoRoot, `work/${streamId}/PLAN.md`),
      "# Test Plan\n\nModified content"
    )
    approveStream(repoRoot, streamId, "admin2")
    
    // Reload and verify that tasks approval is STILL present
    index = loadIndex(repoRoot)
    stream = index.streams[0]!
    
    // BUG: Tasks approval should NOT be wiped out!
    expect(stream.approval?.tasks?.status).toBe("approved")
    expect(stream.approval?.tasks?.task_count).toBe(5)
    } finally {
      cleanupTestWorkstream(workspace)
    }
  })
})
