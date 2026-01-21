/**
 * Branch management for GitHub integration
 * Handles workstream branch creation, checkout, and metadata storage
 */

import { execSync } from "node:child_process";
import type { GitHubConfig } from "./types";
import { loadGitHubConfig } from "./config";
import { ensureGitHubAuth } from "./auth";
import { createGitHubClient } from "./client";
import { loadIndex, saveIndex, getStream } from "../index";

export interface CreateBranchResult {
  branchName: string;
  sha: string;
  url: string;
}

/**
 * Formats a branch name for a workstream.
 * Uses the configured branch prefix (default: "workstream/")
 * @param config The GitHub configuration
 * @param streamId The workstream ID (e.g., "002-github-integration")
 * @returns The formatted branch name (e.g., "workstream/002-github-integration")
 */
export function formatBranchName(config: GitHubConfig, streamId: string): string {
  const prefix = config.branch_prefix || "workstream/";
  return `${prefix}${streamId}`;
}

/**
 * Creates a workstream branch on GitHub and checks it out locally.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @param fromRef Optional base ref to create from (default: repository default branch)
 * @returns The created branch result
 */
export async function createWorkstreamBranch(
  repoRoot: string,
  streamId: string,
  fromRef?: string
): Promise<CreateBranchResult> {
  const config = await loadGitHubConfig(repoRoot);
  
  if (!config.enabled) {
    throw new Error("GitHub integration is not enabled. Run 'work github enable' first.");
  }

  if (!config.owner || !config.repo) {
    throw new Error("GitHub repository not configured. Run 'work github enable' first.");
  }

  const token = await ensureGitHubAuth();
  const client = createGitHubClient(token, config.owner, config.repo);
  
  const branchName = formatBranchName(config, streamId);
  
  // Determine base branch - use provided ref or detect default
  const baseBranch = fromRef || await getDefaultBranch(repoRoot);
  
  // Create the branch on GitHub
  const ref = await client.createBranch(branchName, baseBranch);
  
  // Checkout locally
  await checkoutBranchLocally(repoRoot, branchName);
  
  // Store metadata
  await storeWorkstreamBranchMeta(repoRoot, streamId, branchName);
  
  return {
    branchName,
    sha: ref.object.sha,
    url: `https://github.com/${config.owner}/${config.repo}/tree/${branchName}`,
  };
}

/**
 * Gets the default branch of the repository.
 * Tries to detect from git remote or falls back to "main".
 * @param repoRoot The root directory of the repository
 * @returns The default branch name
 */
async function getDefaultBranch(repoRoot: string): Promise<string> {
  try {
    // Try to get the default branch from git remote
    const result = execSync("git remote show origin", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    
    const match = result.match(/HEAD branch: (.+)/);
    if (match?.[1]) {
      return match[1].trim();
    }
  } catch {
    // Fallback: try main then master
  }
  
  // Check if main branch exists
  try {
    execSync("git rev-parse --verify main", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return "main";
  } catch {
    // Try master
    try {
      execSync("git rev-parse --verify master", {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return "master";
    } catch {
      return "main"; // Default fallback
    }
  }
}

/**
 * Fetches from origin and checks out the branch locally.
 * @param repoRoot The root directory of the repository
 * @param branchName The branch name to checkout
 */
async function checkoutBranchLocally(repoRoot: string, branchName: string): Promise<void> {
  // Fetch the new branch from origin
  execSync("git fetch origin", {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  
  // Checkout the branch
  execSync(`git checkout ${branchName}`, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/**
 * Checks if a workstream branch exists on GitHub.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @returns True if the branch exists, false otherwise
 */
export async function workstreamBranchExists(
  repoRoot: string,
  streamId: string
): Promise<boolean> {
  const config = await loadGitHubConfig(repoRoot);
  
  if (!config.enabled || !config.owner || !config.repo) {
    return false;
  }

  const token = await ensureGitHubAuth();
  const client = createGitHubClient(token, config.owner, config.repo);
  
  const branchName = formatBranchName(config, streamId);
  
  try {
    await client.getBranch(branchName);
    return true;
  } catch (error) {
    // 404 means branch doesn't exist
    if (error instanceof Error && error.message.includes("404")) {
      return false;
    }
    throw error;
  }
}

/**
 * Stores the workstream branch metadata in index.json.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @param branchName The branch name to store
 */
export async function storeWorkstreamBranchMeta(
  repoRoot: string,
  streamId: string,
  branchName: string
): Promise<void> {
  const index = loadIndex(repoRoot);
  const streamIndex = index.streams.findIndex(
    (s) => s.id === streamId || s.name === streamId
  );

  if (streamIndex === -1) {
    throw new Error(`Workstream "${streamId}" not found`);
  }

  const stream = index.streams[streamIndex]!;
  stream.github = {
    ...stream.github,
    branch: branchName,
  };
  stream.updated_at = new Date().toISOString();

  saveIndex(repoRoot, index);
}

/**
 * Gets the branch name for a workstream from the index.
 * @param repoRoot The root directory of the repository
 * @param streamId The workstream ID
 * @returns The branch name or undefined if not set
 */
export function getWorkstreamBranchName(
  repoRoot: string,
  streamId: string
): string | undefined {
  const index = loadIndex(repoRoot);
  const stream = getStream(index, streamId);
  return stream.github?.branch;
}
