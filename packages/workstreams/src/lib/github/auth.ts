import { execSync } from "node:child_process";

export function getAuthFromEnv(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

export function getAuthFromGhCli(): string | undefined {
  try {
    const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

export function getGitHubAuth(): string | undefined {
  return getAuthFromEnv() || getAuthFromGhCli();
}

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export async function ensureGitHubAuth(): Promise<string> {
  const token = getGitHubAuth();
  if (!token) {
    throw new GitHubAuthError(
      "No GitHub authentication found. Please set GITHUB_TOKEN/GH_TOKEN or login via 'gh auth login'."
    );
  }

  const isValid = await validateAuth(token);
  if (!isValid) {
    throw new GitHubAuthError("Invalid GitHub authentication token.");
  }

  return token;
}

export async function validateAuth(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "opencode-agent",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
