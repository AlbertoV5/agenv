import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface TestWorkspace {
  repoRoot: string;
  workDir: string;
  streamId: string;
}

export function createTestWorkstream(streamId: string = "001-test-stream"): TestWorkspace {
  const tempDir = mkdtempSync(join(tmpdir(), "work-test-"));
  const repoRoot = tempDir;
  const workDir = join(repoRoot, "work", streamId);
  
  mkdirSync(workDir, { recursive: true });
  mkdirSync(join(tempDir, ".git"), { recursive: true });

  // Create basic PLAN.md
  writeFileSync(join(workDir, "PLAN.md"), "# Test Plan\n\n## Thread 1\nSummary\n\n## Thread Details\n- [ ] Task 1");

  // Create basic tasks.json
  const tasks = {
    version: "1.0.0",
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    tasks: []
  };
  writeFileSync(join(workDir, "tasks.json"), JSON.stringify(tasks, null, 2));

  return { repoRoot, workDir, streamId };
}

export function cleanupTestWorkstream(workspace: TestWorkspace) {
  if (existsSync(workspace.repoRoot)) {
    rmSync(workspace.repoRoot, { recursive: true, force: true });
  }
}

export async function withTestWorkstream(
  callback: (workspace: TestWorkspace) => Promise<void> | void,
  streamId: string = "001-test-stream"
) {
  const workspace = createTestWorkstream(streamId);
  try {
    await callback(workspace);
  } finally {
    cleanupTestWorkstream(workspace);
  }
}
