// src/lib/files.ts
import { existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
function getFilesRecursively(dir, baseDir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry.startsWith("."))
      continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, baseDir, files);
    } else {
      files.push({
        name: entry,
        path: relative(baseDir, fullPath),
        size: stat.size
      });
    }
  }
  return files;
}
export {
  getFilesRecursively
};
