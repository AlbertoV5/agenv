/**
 * CLI: Review Commits
 *
 * Show commits grouped by stage for a workstream, distinguishing between
 * automated stage-approval commits and human commits made in between.
 */

import { getRepoRoot } from "../lib/repo.ts"
import { loadIndex, resolveStreamId, findStream } from "../lib/index.ts"
import {
  parseGitLog,
  groupCommitsByStage,
  identifyHumanCommits,
  getWorkstreamCommits,
  getCurrentBranch,
  getDefaultBranch,
  type ParsedCommit,
  type CommitsByStage,
} from "../lib/git/log.ts"

interface ReviewCommitsCliArgs {
  repoRoot?: string
  streamId?: string
  stage?: number
  json: boolean
  files: boolean
}

function printHelp(): void {
  console.log(`
work review commits - Review commits grouped by stage for a workstream

Usage:
  work review commits [options]

Options:
  --repo-root, -r   Repository root (auto-detected if omitted)
  --stream, -s      Specific workstream ID or name (uses current if set)
  --stage <num>     Show commits for a specific stage only
  --json, -j        Output as JSON
  --files           Include detailed file changes
  --help, -h        Show this help message

Examples:
  # Review commits for current workstream
  work review commits

  # Review commits for specific workstream
  work review commits --stream 003-stage-commit-tracking

  # Review commits for specific stage
  work review commits --stage 1

  # Include detailed file changes
  work review commits --files

  # JSON output
  work review commits --json
`)
}

function parseCliArgs(argv: string[]): ReviewCommitsCliArgs | null {
  const args = argv.slice(2)
  const parsed: ReviewCommitsCliArgs = {
    json: false,
    files: false,
  }

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

      case "--stage":
        if (!next) {
          console.error("Error: --stage requires a value")
          return null
        }
        const stageNum = parseInt(next, 10)
        if (isNaN(stageNum) || stageNum <= 0) {
          console.error("Error: --stage must be a positive number")
          return null
        }
        parsed.stage = stageNum
        i++
        break

      case "--json":
      case "-j":
        parsed.json = true
        break

      case "--files":
        parsed.files = true
        break

      case "--help":
      case "-h":
        printHelp()
        process.exit(0)

      default:
        if (arg && arg.startsWith("-")) {
          console.error(`Error: Unknown option "${arg}"`)
          return null
        }
    }
  }

  return parsed
}

/**
 * Format commit output for human-readable display
 */
function formatCommitOutput(
  streamId: string,
  branchName: string,
  commitsByStage: CommitsByStage[],
  humanCommits: ParsedCommit[],
  options: { files: boolean; stageFilter?: number }
): string {
  const lines: string[] = []

  lines.push(`Workstream: ${streamId}`)
  lines.push(`Branch: ${branchName}`)
  lines.push("")

  // Filter stages if requested
  const stagesToShow = options.stageFilter
    ? commitsByStage.filter((s) => s.stageNumber === options.stageFilter)
    : commitsByStage

  if (stagesToShow.length === 0 && options.stageFilter) {
    lines.push(`No commits found for stage ${options.stageFilter}`)
    return lines.join("\n")
  }

  for (const stage of stagesToShow) {
    lines.push(`## Stage ${String(stage.stageNumber).padStart(2, "0")}${stage.stageName ? `: ${stage.stageName}` : ""}`)
    lines.push("")

    // Separate stage approval commits from implementation commits
    const approvalCommits = stage.commits.filter((c) =>
      c.subject.toLowerCase().includes("approved")
    )
    const implementationCommits = stage.commits.filter(
      (c) => !c.subject.toLowerCase().includes("approved")
    )

    // Show stage approval commit(s)
    if (approvalCommits.length > 0) {
      lines.push("### Stage Approval Commit")
      for (const commit of approvalCommits) {
        lines.push(formatCommit(commit, options.files))
      }
      lines.push("")
    }

    // Show implementation commits
    if (implementationCommits.length > 0) {
      lines.push("### Implementation Commits")
      for (const commit of implementationCommits) {
        lines.push(formatCommit(commit, options.files))
      }
      lines.push("")
    }
  }

  // Show human commits (commits without workstream trailers)
  const relevantHumanCommits = options.stageFilter
    ? [] // Don't show human commits when filtering by stage
    : humanCommits

  if (relevantHumanCommits.length > 0) {
    lines.push("## Human Commits (manual/external)")
    lines.push("")
    for (const commit of relevantHumanCommits) {
      lines.push(formatCommit(commit, options.files))
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Format a single commit for display
 */
function formatCommit(commit: ParsedCommit, showFiles: boolean): string {
  const date = new Date(commit.date).toISOString().split("T")[0] // YYYY-MM-DD
  let line = `- ${commit.shortSha} [${date}] ${commit.subject}`

  if (showFiles && commit.files.length > 0) {
    // Show files with basic stats
    const fileList = commit.files.join(", ")
    line += `\n  Files: ${fileList}`
  }

  return line
}

/**
 * Format output as JSON
 */
function formatJsonOutput(
  streamId: string,
  branchName: string,
  commitsByStage: CommitsByStage[],
  humanCommits: ParsedCommit[],
  options: { stageFilter?: number }
): string {
  const stagesToShow = options.stageFilter
    ? commitsByStage.filter((s) => s.stageNumber === options.stageFilter)
    : commitsByStage

  const output = {
    workstream: streamId,
    branch: branchName,
    stages: stagesToShow.map((stage) => ({
      stageNumber: stage.stageNumber,
      stageName: stage.stageName,
      commits: stage.commits.map((c) => ({
        sha: c.sha,
        shortSha: c.shortSha,
        author: c.author,
        authorEmail: c.authorEmail,
        date: c.date,
        subject: c.subject,
        files: c.files,
        trailers: c.trailers,
      })),
    })),
    humanCommits: options.stageFilter
      ? []
      : humanCommits.map((c) => ({
          sha: c.sha,
          shortSha: c.shortSha,
          author: c.author,
          authorEmail: c.authorEmail,
          date: c.date,
          subject: c.subject,
          files: c.files,
        })),
  }

  return JSON.stringify(output, null, 2)
}

export function main(argv: string[] = process.argv): void {
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

  // Load index
  let index
  try {
    index = loadIndex(repoRoot)
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  if (index.streams.length === 0) {
    console.log("No workstreams found.")
    return
  }

  // Resolve workstream
  const resolvedStreamId = resolveStreamId(index, cliArgs.streamId)

  if (!resolvedStreamId) {
    console.error(
      "Error: No workstream specified. Use --stream or set current with 'work current --set'"
    )
    process.exit(1)
  }

  const stream = findStream(index, resolvedStreamId)
  if (!stream) {
    console.error(`Error: Workstream "${resolvedStreamId}" not found`)
    process.exit(1)
  }

  // Get branch name from stream metadata or construct it
  let branchName: string
  if (stream.github?.branch) {
    branchName = stream.github.branch
  } else {
    // Fallback: construct branch name from stream ID
    branchName = `workstream/${stream.id}`
  }

  // Check if we're on the workstream branch
  try {
    const currentBranch = getCurrentBranch(repoRoot)
    if (currentBranch !== branchName) {
      console.warn(
        `Warning: Currently on branch "${currentBranch}", but workstream branch is "${branchName}"`
      )
      console.warn("Commits will be shown for the workstream branch.")
      console.warn("")
    }
  } catch (e) {
    // Ignore errors getting current branch
  }

  // Parse git log for the workstream branch
  let commits: ParsedCommit[]
  try {
    const baseBranch = getDefaultBranch(repoRoot)
    commits = parseGitLog(repoRoot, branchName, baseBranch)
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`)
    process.exit(1)
  }

  if (commits.length === 0) {
    console.log(`No commits found for workstream "${stream.id}" on branch "${branchName}"`)
    return
  }

  // Filter commits for this workstream
  const workstreamCommits = getWorkstreamCommits(commits, stream.id)

  // Group commits by stage
  const commitsByStage = groupCommitsByStage(workstreamCommits, stream.id)

  // Identify human commits (those without workstream trailers)
  const humanCommits = identifyHumanCommits(commits)

  // Format and output
  if (cliArgs.json) {
    const output = formatJsonOutput(
      stream.id,
      branchName,
      commitsByStage,
      humanCommits,
      { stageFilter: cliArgs.stage }
    )
    console.log(output)
  } else {
    const output = formatCommitOutput(
      stream.id,
      branchName,
      commitsByStage,
      humanCommits,
      { files: cliArgs.files, stageFilter: cliArgs.stage }
    )
    console.log(output)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}
