/**
 * Repository detection utilities
 *
 * Provides functions to detect the root of a git repository
 * from any working directory.
 */

import { existsSync } from "fs"
import { join, dirname, resolve } from "path"

/**
 * Find the git repository root starting from the given path.
 * Walks up the directory tree looking for a .git directory.
 *
 * @param startPath - Path to start searching from (defaults to cwd)
 * @returns The repository root path, or null if not in a git repo
 */
export function findRepoRoot(startPath?: string): string | null {
  let current = resolve(startPath || process.cwd())
  const root = dirname(current)

  while (current !== root) {
    if (existsSync(join(current, ".git"))) {
      return current
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  // Check root as well
  if (existsSync(join(current, ".git"))) {
    return current
  }

  return null
}

/**
 * Get the repository root, throwing an error if not in a git repository.
 *
 * @param startPath - Path to start searching from (defaults to cwd)
 * @returns The repository root path
 * @throws Error if not in a git repository
 */
export function getRepoRoot(startPath?: string): string {
  const root = findRepoRoot(startPath)
  if (!root) {
    throw new Error(
      "Not in a git repository. Run this command from within a git repository, " +
      "or specify --repo-root explicitly."
    )
  }
  return root
}

/**
 * Get the workstreams directory path for a repository.
 *
 * @param repoRoot - The repository root path
 * @returns The workstreams directory path (docs/work)
 */
export function getWorkDir(repoRoot: string): string {
  return join(repoRoot, "docs", "work")
}

/**
 * Get the index.json path for a repository.
 *
 * @param repoRoot - The repository root path
 * @returns The index.json file path
 */
export function getIndexPath(repoRoot: string): string {
  return join(getWorkDir(repoRoot), "index.json")
}
