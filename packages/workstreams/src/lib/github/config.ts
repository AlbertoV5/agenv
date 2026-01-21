import { join, dirname } from "node:path";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { type GitHubConfig, DEFAULT_GITHUB_CONFIG } from "./types";

const execAsync = promisify(exec);

/**
 * Returns the path to the GitHub configuration file.
 * @param repoRoot The root directory of the repository
 * @returns The absolute path to work/github.json
 */
export function getGitHubConfigPath(repoRoot: string): string {
  return join(repoRoot, "work", "github.json");
}

/**
 * Loads and parses the GitHub configuration file.
 * Returns default config if file does not exist.
 * @param repoRoot The root directory of the repository
 * @returns The GitHub configuration
 */
export async function loadGitHubConfig(repoRoot: string): Promise<GitHubConfig> {
  const configPath = getGitHubConfigPath(repoRoot);
  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as GitHubConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_GITHUB_CONFIG;
    }
    throw error;
  }
}

/**
 * Saves the GitHub configuration file atomically.
 * @param repoRoot The root directory of the repository
 * @param config The configuration to save
 */
export async function saveGitHubConfig(repoRoot: string, config: GitHubConfig): Promise<void> {
  const configPath = getGitHubConfigPath(repoRoot);
  const tempPath = `${configPath}.tmp`;

  // Ensure directory exists
  await mkdir(dirname(configPath), { recursive: true });

  await writeFile(tempPath, JSON.stringify(config, null, 2), "utf-8");
  await rename(tempPath, configPath);
}

/**
 * Checks if GitHub integration is enabled.
 * @param repoRoot The root directory of the repository
 * @returns True if enabled, false otherwise
 */
export async function isGitHubEnabled(repoRoot: string): Promise<boolean> {
  const config = await loadGitHubConfig(repoRoot);
  return config.enabled;
}

/**
 * Detects the GitHub repository owner and name from the git remote 'origin'.
 * @param repoRoot The root directory of the repository
 * @returns The owner and repo name, or null if detection fails
 */
export async function detectRepository(repoRoot: string): Promise<{ owner: string; repo: string } | null> {
  try {
    const { stdout } = await execAsync("git remote get-url origin", { cwd: repoRoot });
    const url = stdout.trim();
    // Match SSH (git@github.com:owner/repo.git) or HTTPS (https://github.com/owner/repo.git)
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enables GitHub integration by detecting the repository and saving the config.
 * @param repoRoot The root directory of the repository
 * @throws Error if repository cannot be auto-detected
 */
export async function enableGitHub(repoRoot: string): Promise<void> {
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

/**
 * Disables GitHub integration.
 * @param repoRoot The root directory of the repository
 */
export async function disableGitHub(repoRoot: string): Promise<void> {
  const config = await loadGitHubConfig(repoRoot);
  config.enabled = false;
  await saveGitHubConfig(repoRoot, config);
}
