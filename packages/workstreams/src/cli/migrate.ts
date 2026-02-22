/**
 * CLI: Migrate legacy tasks.json data to threads.json
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { migrateTasksToThreads } from "../lib/threads.ts"

interface MigrateCliArgs {
  repoRoot?: string
  streamId?: string
  archiveTasksJson: boolean
  removeTasksJson: boolean
  json: boolean
  target?: string
}

function printHelp(): void {
  console.log(`
work migrate - Migrate legacy workstream artifacts

Usage:
  work migrate tasks-to-threads [--stream <id>] [options]

Options:
  --repo-root, -r      Repository root (auto-detected if omitted)
  --stream, -s         Workstream ID or name (uses current if not specified)
  --archive-tasks-json Move tasks.json to a timestamped archive file after migration
  --remove-tasks-json  Remove tasks.json after migration (destructive)
  --json, -j           Output as JSON
  --help, -h           Show this help message

Notes:
  - By default migration is non-destructive: tasks.json is kept and backed up.
  - Use --archive-tasks-json to keep a renamed archive instead.
`)
}

function parseCliArgs(argv: string[]): MigrateCliArgs | null {
  const args = argv.slice(2)
  const parsed: MigrateCliArgs = {
    archiveTasksJson: false,
    removeTasksJson: false,
    json: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    if (arg === "tasks-to-threads") {
      parsed.target = arg
      continue
    }

    switch (arg) {
      case "--repo-root":
      case "-r":
        if (!next) {
          console.error("Error: --repo-root requires a value")
          return null
        }
        parsed.repoRoot = next
        i++
        break
      case "--stream":
      case "-s":
        if (!next) {
          console.error("Error: --stream requires a value")
          return null
        }
        parsed.streamId = next
        i++
        break
      case "--archive-tasks-json":
        parsed.archiveTasksJson = true
        break
      case "--remove-tasks-json":
        parsed.removeTasksJson = true
        break
      case "--json":
      case "-j":
        parsed.json = true
        break
      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
      default:
        if (arg?.startsWith("-")) {
          console.error(`Error: Unknown option "${arg}"`)
          return null
        }
    }
  }

  if (parsed.archiveTasksJson && parsed.removeTasksJson) {
    console.error("Error: --archive-tasks-json and --remove-tasks-json are mutually exclusive")
    return null
  }

  return parsed
}

export function main(argv: string[] = process.argv): void {
  const cliArgs = parseCliArgs(argv)
  if (!cliArgs) {
    console.error("\nRun with --help for usage information.")
    process.exit(1)
  }

  if (cliArgs.target && cliArgs.target !== "tasks-to-threads") {
    console.error(`Error: Unsupported migrate target "${cliArgs.target}"`)
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

  try {
    const migration = migrateTasksToThreads(repoRoot, stream.id, {
      archiveTasksJson: cliArgs.archiveTasksJson,
      removeTasksJson: cliArgs.removeTasksJson,
    })

    if (cliArgs.json) {
      console.log(
        JSON.stringify(
          {
            action: migration.migrated ? "migrated" : "skipped",
            target: "tasks-to-threads",
            streamId: stream.id,
            streamName: stream.name,
            ...migration,
          },
          null,
          2,
        ),
      )
      return
    }

    if (!migration.tasksJsonFound) {
      console.log(`No tasks.json found for workstream "${stream.name}" (${stream.id}). Nothing to migrate.`)
      return
    }

    console.log(`Migrated tasks.json to threads.json for workstream "${stream.name}" (${stream.id})`)
    console.log(`  Tasks scanned: ${migration.taskCount}`)
    console.log(`  Threads touched: ${migration.threadsTouched}`)
    console.log(`  Threads created: ${migration.threadsCreated}`)
    console.log(`  Sessions migrated: ${migration.sessionsMigrated}`)
    if (migration.backupPath) {
      console.log(`  Backup: ${migration.backupPath}`)
    }
    if (migration.archivePath) {
      console.log(`  Archived tasks.json: ${migration.archivePath}`)
    } else if (migration.removedTasksJson) {
      console.log("  Removed tasks.json")
    } else {
      console.log("  Kept tasks.json (non-destructive default)")
    }
    if (migration.errors.length > 0) {
      console.log(`  Warnings: ${migration.errors.length}`)
      for (const error of migration.errors.slice(0, 3)) {
        console.log(`    - ${error}`)
      }
    }
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
}

if (import.meta.main) {
  main()
}
