/**
 * CLI: Files
 *
 * List and index files in a workstream's files/ directory.
 */

import { existsSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"
import { getRepoRoot, getWorkDir } from "../lib/repo.ts"
import { loadIndex, getResolvedStream, saveIndex } from "../lib/index.ts"

interface FilesCliArgs {
  repoRoot?: string
  streamId?: string
  save?: boolean
}

interface FileInfo {
  name: string
  path: string
  size: number
}

function printHelp(): void {
  console.log(`
work files - List and index files in a workstream's files/ directory

Usage:
  work files [--stream <id>] [options]

Options:
  --stream, -s <id>   Workstream ID or name (uses current if not specified)
  --save              Save file list to workstream metadata in index.json
  --repo-root <path>  Repository root (auto-detected)
  --help, -h          Show this help message

Output:
  Lists all files in the workstream's files/ directory with their sizes.
  Use --save to update the workstream's 'files' field in index.json.

File Naming Convention:
  Use descriptive names that explain the file's purpose:
  - architecture-diagram.png
  - api-endpoints-poc.ts
  - performance-benchmarks.md
  - database-schema-notes.md

Examples:
  work files                  # List files (uses current workstream)
  work files --save           # Save file list to index.json
  work files --stream "001-my-feature" --save
`)
}

function parseCliArgs(argv: string[]): FilesCliArgs | null {
  const args = argv.slice(2)
  const parsed: Partial<FilesCliArgs> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--repo-root":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break

      case "--stream":
      case "-s":
      case "--plan":
      case "-p":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break

      case "--save":
        parsed.save = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
    }
  }

  return parsed as FilesCliArgs
}

function getFilesRecursively(
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  let repoRoot: string
  try {
    repoRoot = cliArgs.repoRoot ?? getRepoRoot()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  let stream
  try {
    stream = getResolvedStream(index, cliArgs.streamId)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const filesDir = join(getWorkDir(repoRoot), stream.id, "files")

  if (!existsSync(filesDir)) {
    console.log(`No files/ directory found for workstream "${stream.id}"`)
    process.exit(0)
  }

  const files = getFilesRecursively(filesDir, filesDir)

  if (files.length === 0) {
    console.log(`Workstream: ${stream.id}`)
    console.log(`Files: 0`)
    console.log(`\nNo files in files/ directory.`)
  } else {
    console.log(`Workstream: ${stream.id}`)
    console.log(`Files: ${files.length}`)
    console.log("")

    // Sort by path
    files.sort((a, b) => a.path.localeCompare(b.path))

    for (const file of files) {
      console.log(`  ${file.path} (${formatSize(file.size)})`)
    }
  }

  if (cliArgs.save) {
    // Extract just the file paths (relative to files/ directory)
    const fileNames = files.map((f) => f.path).sort()

    // Update stream metadata in index
    stream.files = fileNames
    stream.updated_at = new Date().toISOString()
    saveIndex(repoRoot, index)

    console.log(`\nSaved ${fileNames.length} file(s) to workstream metadata in index.json`)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
