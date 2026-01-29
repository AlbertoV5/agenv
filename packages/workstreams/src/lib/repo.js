// src/lib/repo.ts
import { existsSync } from "fs";
import { join, dirname, resolve } from "path";
function findRepoRoot(startPath) {
  let current = resolve(startPath || process.cwd());
  const root = dirname(current);
  while (current !== root) {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current)
      break;
    current = parent;
  }
  if (existsSync(join(current, ".git"))) {
    return current;
  }
  return null;
}
function getRepoRoot(startPath) {
  const root = findRepoRoot(startPath);
  if (!root) {
    throw new Error("Not in a git repository. Run this command from within a git repository, " + "or specify --repo-root explicitly.");
  }
  return root;
}
function getWorkDir(repoRoot) {
  return join(repoRoot, "work");
}
function getIndexPath(repoRoot) {
  return join(getWorkDir(repoRoot), "index.json");
}
export {
  getWorkDir,
  getRepoRoot,
  getIndexPath,
  findRepoRoot
};
