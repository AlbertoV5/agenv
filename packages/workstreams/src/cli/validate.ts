/**
 * CLI: Workstream Validate
 *
 * Validate PLAN.md structure and content.
 */

import { existsSync, readFileSync } from "fs"
import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream } from "../lib/index.ts"
import { getStreamPlanMdPath, consolidateStream } from "../lib/consolidate.ts"

interface ValidateCliArgs {
    repoRoot?: string
    streamId?: string
    subcommand?: "plan"
    json: boolean
}

interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

function printHelp(): void {
    console.log(`
work validate - Validate workstream plan structure

Usage:
  work validate plan [--stream <stream-id>]

Subcommands:
  plan     Validate PLAN.md structure and content

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Validates PLAN.md schema structure (stages, batches, threads).
  Note: Use 'work check plan' to check for open questions and missing input files.

Examples:
  # Validate current workstream plan
  work validate plan

  # Validate specific workstream
  work validate plan --stream "001-my-stream"

  # Output as JSON
  work validate plan --json
`)
}

function parseCliArgs(argv: string[]): ValidateCliArgs | null {
    const args = argv.slice(2)
    const parsed: ValidateCliArgs = { json: false }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const next = args[i + 1]

        // Handle subcommand
        if (arg === "plan" && !parsed.subcommand) {
            parsed.subcommand = "plan"
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

            case "--json":
            case "-j":
                parsed.json = true
                break

            case "--help":
            case "-h":
                printHelp()
                process.exit(0)
        }
    }

    return parsed
}

function formatValidationResult(result: ValidationResult): string {
    const lines: string[] = []

    if (result.valid) {
        lines.push("✓ PLAN.md validation passed")
    } else {
        lines.push("✗ PLAN.md validation failed")
    }

    if (result.errors.length > 0) {
        lines.push("")
        lines.push("Errors:")
        for (const error of result.errors) {
            lines.push(`  - ${error}`)
        }
    }

    if (result.warnings.length > 0) {
        lines.push("")
        lines.push("Warnings:")
        for (const warning of result.warnings) {
            lines.push(`  - ${warning}`)
        }
    }

    return lines.join("\n")
}

export function main(argv: string[] = process.argv): void {
    const cliArgs = parseCliArgs(argv)
    if (!cliArgs) {
        console.error("\nRun with --help for usage information.")
        process.exit(1)
    }

    // Validate subcommand
    if (!cliArgs.subcommand) {
        console.error("Error: subcommand required (e.g., 'plan')")
        console.error("\nRun with --help for usage information.")
        process.exit(1)
    }

    // Auto-detect repo root if not provided
    let repoRoot: string
    try {
        repoRoot = cliArgs.repoRoot ?? getRepoRoot()
    } catch (e) {
        console.error((e as Error).message)
        process.exit(1)
    }

    // Load index and find workstream (uses current if not specified)
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

    if (cliArgs.subcommand === "plan") {
        const planMdPath = getStreamPlanMdPath(repoRoot, stream.id)
        if (!existsSync(planMdPath)) {
            console.error(`Error: PLAN.md not found at ${planMdPath}`)
            process.exit(1)
        }

        // Run schema validation
        const consolidateResult = consolidateStream(repoRoot, stream.id, true)

        const result: ValidationResult = {
            valid: consolidateResult.success,
            errors: consolidateResult.errors.map(e => `[${e.section || "?"}] ${e.message}`),
            warnings: consolidateResult.warnings,
        }

        if (cliArgs.json) {
            console.log(JSON.stringify(result, null, 2))
        } else {
            console.log(formatValidationResult(result))
        }

        // Exit with error if validation failed
        if (!result.valid) {
            process.exit(1)
        }
    }
}

// Run if called directly
if (import.meta.main) {
    main()
}
