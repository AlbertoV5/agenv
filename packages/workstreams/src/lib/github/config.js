// src/lib/github/config.ts
import { join, dirname } from "node:path";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

// src/lib/github/types.ts
var DEFAULT_GITHUB_CONFIG = {
  enabled: false,
  owner: "",
  repo: "",
  branch_prefix: "workstream/",
  auto_create_issues: true,
  auto_commit_on_approval: true,
  label_config: {
    workstream: { prefix: "stream:", color: "5319e7" },
    thread: { prefix: "thread:", color: "0e8a16" },
    batch: { prefix: "batch:", color: "0e8a16" },
    stage: { prefix: "stage:", color: "1d76db" }
  }
};

// src/lib/github/config.ts
var execAsync = promisify(exec);
function getGitHubConfigPath(repoRoot) {
  return join(repoRoot, "work", "github.json");
}
async function loadGitHubConfig(repoRoot) {
  const configPath = getGitHubConfigPath(repoRoot);
  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return DEFAULT_GITHUB_CONFIG;
    }
    throw error;
  }
}
async function saveGitHubConfig(repoRoot, config) {
  const configPath = getGitHubConfigPath(repoRoot);
  const tempPath = `${configPath}.tmp`;
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(tempPath, JSON.stringify(config, null, 2), "utf-8");
  await rename(tempPath, configPath);
}
async function isGitHubEnabled(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  return config.enabled;
}
async function detectRepository(repoRoot) {
  try {
    const { stdout } = await execAsync("git remote get-url origin", { cwd: repoRoot });
    const url = stdout.trim();
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}
async function enableGitHub(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  const repoInfo = await detectRepository(repoRoot);
  if (!repoInfo) {
    if (!config.owner || !config.repo) {
      throw new Error("Could not detect GitHub repository from 'origin' remote");
    }
  } else {
    config.owner = repoInfo.owner;
    config.repo = repoInfo.repo;
  }
  config.enabled = true;
  await saveGitHubConfig(repoRoot, config);
}
async function disableGitHub(repoRoot) {
  const config = await loadGitHubConfig(repoRoot);
  config.enabled = false;
  await saveGitHubConfig(repoRoot, config);
}
export {
  saveGitHubConfig,
  loadGitHubConfig,
  isGitHubEnabled,
  getGitHubConfigPath,
  enableGitHub,
  disableGitHub,
  detectRepository
};
