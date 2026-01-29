// src/lib/github/auth.ts
import { execSync } from "node:child_process";
function getAuthFromEnv() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (process.env.DEBUG_AUTH) {
    console.log(`[auth] GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? `set (${process.env.GITHUB_TOKEN.substring(0, 15)}...)` : "not set"}`);
    console.log(`[auth] GH_TOKEN: ${process.env.GH_TOKEN ? `set (${process.env.GH_TOKEN.substring(0, 15)}...)` : "not set"}`);
    console.log(`[auth] Using: ${process.env.GITHUB_TOKEN ? "GITHUB_TOKEN" : "GH_TOKEN"}`);
  }
  return token;
}
function getAuthFromGhCli() {
  try {
    const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
    return token || undefined;
  } catch {
    return;
  }
}
function getGitHubAuth() {
  return getAuthFromEnv() || getAuthFromGhCli();
}

class GitHubAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitHubAuthError";
  }
}
async function ensureGitHubAuth(owner, repo) {
  const token = getGitHubAuth();
  if (!token) {
    throw new GitHubAuthError("No GitHub authentication found. Please set GITHUB_TOKEN/GH_TOKEN or login via 'gh auth login'.");
  }
  const isValid = await validateAuth(token, owner, repo);
  if (!isValid) {
    throw new GitHubAuthError("Invalid GitHub authentication token.");
  }
  return token;
}
async function validateAuth(token, owner, repo) {
  try {
    const url = owner && repo ? `https://api.github.com/repos/${owner}/${repo}` : "https://api.github.com/rate_limit";
    if (process.env.DEBUG_AUTH) {
      console.log(`[auth] Validating against: ${url}`);
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "opencode-agent"
      }
    });
    if (process.env.DEBUG_AUTH) {
      console.log(`[auth] Response status: ${response.status}`);
    }
    return response.ok;
  } catch (error) {
    if (process.env.DEBUG_AUTH) {
      console.log(`[auth] Fetch error: ${error}`);
    }
    return false;
  }
}
export {
  validateAuth,
  getGitHubAuth,
  getAuthFromGhCli,
  getAuthFromEnv,
  ensureGitHubAuth,
  GitHubAuthError
};
