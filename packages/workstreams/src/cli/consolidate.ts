// This file has been deprecated and replaced by:
// - work review (src/cli/review.ts)
// - work validate (src/cli/validate.ts) 
// - work check (src/cli/check.ts)
//
// The library functions remain in src/lib/consolidate.ts

export function main(_argv: string[] = process.argv): void {
  console.error("Error: 'work consolidate' has been removed.")
  console.error("")
  console.error("Use instead:")
  console.error("  work validate plan   - Validate PLAN.md structure")
  console.error("  work check plan      - Find unchecked items with line numbers")
  console.error("  work review plan     - Output full PLAN.md content")
  process.exit(1)
}

// Run if called directly
if (import.meta.main) {
  main()
}
