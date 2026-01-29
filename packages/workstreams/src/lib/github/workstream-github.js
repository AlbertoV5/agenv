// src/lib/github/workstream-github.ts
import { join as join2, dirname as dirname2 } from "node:path";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";

// src/lib/repo.ts
import { join, dirname, resolve } from "path";
function getWorkDir(repoRoot) {
  return join(repoRoot, "work");
}

// src/lib/github/workstream-github.ts
function getWorkstreamGitHubPath(repoRoot, streamId) {
  return join2(getWorkDir(repoRoot), streamId, "github.json");
}
async function loadWorkstreamGitHub(repoRoot, streamId) {
  const configPath = getWorkstreamGitHubPath(repoRoot, streamId);
  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function saveWorkstreamGitHub(repoRoot, streamId, data) {
  const configPath = getWorkstreamGitHubPath(repoRoot, streamId);
  const tempPath = `${configPath}.tmp`;
  await mkdir(dirname2(configPath), { recursive: true });
  data.last_updated = new Date().toISOString();
  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await rename(tempPath, configPath);
}
async function initWorkstreamGitHub(repoRoot, streamId) {
  const data = {
    version: "1.0.0",
    stream_id: streamId,
    last_updated: new Date().toISOString(),
    stages: {}
  };
  await saveWorkstreamGitHub(repoRoot, streamId, data);
  return data;
}
function getStageIssue(data, stageNumber) {
  return data.stages[stageNumber];
}
function setStageIssue(data, stageNumber, issue) {
  data.stages[stageNumber] = issue;
}
function updateStageIssueState(data, stageNumber, state, closedAt) {
  const issue = data.stages[stageNumber];
  if (issue) {
    issue.state = state;
    if (state === "closed" && closedAt) {
      issue.closed_at = closedAt;
    } else if (state === "open") {
      delete issue.closed_at;
    }
  }
}
export {
  updateStageIssueState,
  setStageIssue,
  saveWorkstreamGitHub,
  loadWorkstreamGitHub,
  initWorkstreamGitHub,
  getWorkstreamGitHubPath,
  getStageIssue
};
