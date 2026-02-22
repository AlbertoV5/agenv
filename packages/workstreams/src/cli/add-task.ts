/**
 * CLI: Add Task (deprecated)
 */

function printHelp(): void {
  console.log(`
work add-task - Deprecated (removed)

Tasks are no longer the execution unit.
Define threads in PLAN.md, then run:
  work approve plan

Optional assignment step:
  work assign --thread "01.01.01" --agent "agent-name"
`)
}

export async function main(_argv: string[] = process.argv): Promise<void> {
  printHelp()
  process.exit(1)
}

if (import.meta.main) {
  main()
}
