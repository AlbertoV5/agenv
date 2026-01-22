/**
 * CLI: Start Workstream
 *
 * Start a workstream after all approvals are complete.
 * Creates the GitHub branch and issues for all threads.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, getResolvedStream, saveIndex } from "../lib/index.ts"
import {
    isFullyApproved,
    getFullApprovalStatus,
    getApprovalStatus,
    getTasksApprovalStatus,
    getPromptsApprovalStatus,
} from "../lib/approval.ts"
import { isGitHubEnabled, loadGitHubConfig } from "../lib/github/config.ts"
import { createWorkstreamBranch } from "../lib/github/branches.ts"
import { createIssuesForWorkstream } from "../lib/github/sync.ts"

interface StartCliArgs {
    repoRoot?: string
    streamId?: string
    json: boolean
}

function printHelp(): void {
    console.log(`
work start - Start a workstream after approvals are complete

Usage:
  work start [--stream <id>] [--json]

Options:
  --repo-root, -r  Repository root (auto-detected if omitted)
  --stream, -s     Workstream ID or name (uses current if not specified)
  --json, -j       Output as JSON
  --help, -h       Show this help message

Description:
  Start a workstream after all 3 approvals (plan, tasks, prompts) are complete.
  
  This command:
  1. Creates the workstream branch on GitHub (workstream/{streamId})
  2. Checks out the branch locally
  3. Creates GitHub issues for all threads in the workstream

Prerequisites:
  - Run 'work approve plan' to approve the PLAN.md
  - Run 'work approve tasks' to approve tasks.json
  - Run 'work approve prompts' to approve prompt files
  - Run 'work approve' to check approval status

Examples:
  # Start current workstream
  work start

  # Start specific workstream
  work start --stream "001-my-feature"

  # Output as JSON
  work start --json
`)
}

function parseCliArgs(argv: string[]): StartCliArgs | null {
    const args = argv.slice(2)
    const parsed: StartCliArgs = { json: false }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const next = args[i + 1]

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

export async function main(argv: string[] = process.argv): Promise<void> {
    const cliArgs = parseCliArgs(argv)
    if (!cliArgs) {
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

    // Load index and find workstream
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

    // Check all approvals
    const fullStatus = getFullApprovalStatus(stream)

    if (!fullStatus.fullyApproved) {
        const missing: string[] = []
        if (fullStatus.plan !== "approved") missing.push("plan")
        if (fullStatus.tasks !== "approved") missing.push("tasks")
        if (fullStatus.prompts !== "approved") missing.push("prompts")

        if (cliArgs.json) {
            console.log(JSON.stringify({
                action: "blocked",
                reason: "missing_approvals",
                streamId: stream.id,
                streamName: stream.name,
                missingApprovals: missing,
                approvalStatus: fullStatus,
            }, null, 2))
        } else {
            console.error("Error: Cannot start workstream - missing approvals")
            console.error("")
            console.error(`  Plan:    ${fullStatus.plan}`)
            console.error(`  Tasks:   ${fullStatus.tasks}`)
            console.error(`  Prompts: ${fullStatus.prompts}`)
            console.error("")
            console.error("Run 'work approve <target>' to approve missing items:")
            for (const item of missing) {
                console.error(`  work approve ${item}`)
            }
        }
        process.exit(1)
    }

    // Check if GitHub is enabled
    const githubEnabled = await isGitHubEnabled(repoRoot)
    if (!githubEnabled) {
        if (cliArgs.json) {
            console.log(JSON.stringify({
                action: "blocked",
                reason: "github_not_enabled",
                streamId: stream.id,
                streamName: stream.name,
            }, null, 2))
        } else {
            console.error("Error: GitHub integration is not enabled")
            console.error("Run 'work github enable' to enable it")
        }
        process.exit(1)
    }

    if (!cliArgs.json) {
        console.log(`Starting workstream "${stream.name}" (${stream.id})...`)
        console.log("")
    }

    // Step 1: Create branch
    let branchResult: { branchName: string; sha: string; url: string } | null = null

    if (stream.github?.branch) {
        if (!cliArgs.json) {
            console.log(`Branch already exists: ${stream.github.branch}`)
        }
        branchResult = {
            branchName: stream.github.branch,
            sha: "",
            url: "",
        }
    } else {
        try {
            if (!cliArgs.json) {
                console.log("Creating branch...")
            }
            branchResult = await createWorkstreamBranch(repoRoot, stream.id)
            if (!cliArgs.json) {
                console.log(`  ✅ Branch: ${branchResult.branchName}`)
                console.log(`  SHA: ${branchResult.sha.substring(0, 7)}`)
            }
        } catch (e) {
            if (cliArgs.json) {
                console.log(JSON.stringify({
                    action: "error",
                    step: "create_branch",
                    error: (e as Error).message,
                    streamId: stream.id,
                }, null, 2))
            } else {
                console.error(`Error creating branch: ${(e as Error).message}`)
            }
            process.exit(1)
        }
    }

    // Step 2: Create issues for all threads
    let issuesResult
    try {
        if (!cliArgs.json) {
            console.log("")
            console.log("Creating issues for all threads...")
        }
        issuesResult = await createIssuesForWorkstream(repoRoot, stream.id)

        if (!cliArgs.json) {
            if (issuesResult.created.length > 0) {
                console.log(`  ✅ Created ${issuesResult.created.length} issue(s)`)
                for (const item of issuesResult.created) {
                    console.log(`     ${item.threadName}: ${item.issueUrl}`)
                }
            }

            if (issuesResult.skipped.length > 0) {
                console.log(`  ⏭️  Skipped ${issuesResult.skipped.length} (already exist)`)
            }

            if (issuesResult.errors.length > 0) {
                console.log(`  ⚠️  Errors: ${issuesResult.errors.length}`)
                for (const item of issuesResult.errors) {
                    console.log(`     ${item.threadName}: ${item.error}`)
                }
            }
        }
    } catch (e) {
        if (cliArgs.json) {
            console.log(JSON.stringify({
                action: "error",
                step: "create_issues",
                error: (e as Error).message,
                streamId: stream.id,
                branchCreated: !!branchResult,
            }, null, 2))
        } else {
            console.error(`Error creating issues: ${(e as Error).message}`)
        }
        process.exit(1)
    }

    // Output final result
    if (cliArgs.json) {
        console.log(JSON.stringify({
            action: "started",
            streamId: stream.id,
            streamName: stream.name,
            branch: branchResult ? {
                name: branchResult.branchName,
                sha: branchResult.sha,
                url: branchResult.url,
            } : null,
            issues: {
                created: issuesResult.created.length,
                skipped: issuesResult.skipped.length,
                errors: issuesResult.errors.length,
                details: issuesResult.created,
            },
        }, null, 2))
    } else {
        console.log("")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.log(`Workstream "${stream.name}" started successfully!`)
        console.log("")
        console.log(`Branch: ${branchResult?.branchName}`)
        console.log(`Issues: ${issuesResult.created.length} created, ${issuesResult.skipped.length} skipped`)
        console.log("")
        console.log("Next steps:")
        console.log("  1. Run 'work multi' to start working on threads")
        console.log("  2. Or run 'work execute --thread <id>' for single thread")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    }
}

// Run if called directly
if (import.meta.main) {
    await main()
}
