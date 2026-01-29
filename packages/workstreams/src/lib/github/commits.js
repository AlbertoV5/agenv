// src/lib/github/commits.ts
import { execSync } from "node:child_process";
function formatStageCommitMessage(streamId, streamName, stageNum, stageName) {
  const title = `Stage ${stageNum} approved: ${stageName}`;
  const body = [
    `Approved stage ${stageNum} of workstream ${streamId}.`,
    "",
    `Stream-Id: ${streamId}`,
    `Stream-Name: ${streamName}`,
    `Stage: ${stageNum}`,
    `Stage-Name: ${stageName}`
  ].join(`
`);
  return { title, body };
}
function hasUncommittedChanges(repoRoot) {
  try {
    const statusOutput = execSync("git status --porcelain", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return statusOutput.length > 0;
  } catch {
    return false;
  }
}
function createStageApprovalCommit(repoRoot, stream, stageNum, stageName) {
  try {
    execSync("git add -A", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    if (!hasUncommittedChanges(repoRoot)) {
      return {
        success: true,
        skipped: true
      };
    }
    const { title, body } = formatStageCommitMessage(stream.id, stream.name, stageNum, stageName);
    const escapedBody = body.replace(/"/g, "\\\"");
    execSync(`git commit -m "${title}" -m "${escapedBody}"`, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    const commitSha = execSync("git rev-parse HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return {
      success: true,
      commitSha
    };
  } catch (error) {
    const errorMessage = error.message || String(error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
export {
  hasUncommittedChanges,
  formatStageCommitMessage,
  createStageApprovalCommit
};
