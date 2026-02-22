/**
 * CLI: Tasks (deprecated)
 */

function printHelp(): void {
  console.log(`
work tasks - Deprecated

The task-centric workflow has been removed.

Removed commands:
  work tasks generate
  work tasks serialize

Use this thread-first workflow instead:
  1) work approve plan
  2) work assign --thread "01.01.01" --agent "agent-name"
  3) work list --threads
`)
}

export function main(argv: string[] = process.argv): void {
  const args = argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    printHelp()
    process.exit(0)
  }

  const command = args[0]
  if (command === "generate" || command === "serialize") {
    console.error(`Deprecated: 'work tasks ${command}' has been removed.`)
    console.error("Run 'work approve plan' to populate threads.json from PLAN.md.")
    process.exit(1)
  }

  printHelp()
  process.exit(1)
}

if (import.meta.main) {
  main()
}
