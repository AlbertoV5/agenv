/**
 * CLI: Continue (Alias)
 *
 * This command is now an alias for `work multi --continue`.
 * The original `work continue` functionality has been moved to `work context`.
 */

import { main as multiMain } from "./multi.ts"

function printHelp(): void {
  console.log(`
work continue - Continue execution (Alias for 'work multi --continue')

Usage:
  work continue [options]

Description:
  This is a convenience alias that runs:
    work multi --continue [options]

  It finds the next incomplete batch and executes it in parallel using tmux.

  NOTE: The previous "context/breadcrumbs" functionality of 'work continue'
  has been moved to 'work context'.

Options:
  --port, -p       OpenCode server port (default: 4096)
  --dry-run        Show commands without executing
  --no-server      Skip starting opencode serve
  --repo-root, -r  Repository root
  --help, -h       Show this help message

Examples:
  work continue
  work continue --dry-run
`)
}

export async function main(argv: string[] = process.argv): Promise<void> {
  // Check for help
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp()
    process.exit(0)
  }

  // Inject --continue if not present (though multiMain handles checking flags,
  // we want to ensure it acts as continue)
  // Actually, multiMain looks for --continue or --batch.
  // We can just construct a new argv that includes --continue.

  // We need to keep the process structure [node, script, ...args]
  // The original argv is usually [bun, /path/to/continue.ts, ...args]

  const originalArgs = argv.slice(2)
  const newArgs = [
    argv[0]!, // runtime
    argv[1]!, // script path (doesn't matter much for multiMain internal logic if it parses slices)
    "--continue",
    ...originalArgs
  ]

  // Call multiMain
  await multiMain(newArgs)
}

// Run if called directly
if (import.meta.main) {
  main()
}
