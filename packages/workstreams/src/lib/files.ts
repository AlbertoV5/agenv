/**
 * File system management for workstreams
 */

import { existsSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

/**
 * File information for workstream outputs
 */
export interface FileInfo {
  name: string
  path: string
  size: number
}

/**
 * Get all files in a directory recursively
 */
export function getFilesRecursively(
  dir: string,
  baseDir: string,
  files: FileInfo[] = []
): FileInfo[] {
  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    // Skip hidden files
    if (entry.startsWith(".")) continue

    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, baseDir, files)
    } else {
      files.push({
        name: entry,
        path: relative(baseDir, fullPath),
        size: stat.size,
      })
    }
  }

  return files
}
