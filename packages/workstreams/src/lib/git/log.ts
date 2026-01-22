/**
 * Git log parsing functions for workstream commit tracking
 *
 * Provides utilities for extracting and analyzing commits with workstream trailers,
 * supporting the `work review-commits` command.
 */

import { execSync } from "node:child_process"

/**
 * Workstream trailer information extracted from a commit message
 */
export interface WorkstreamTrailers {
  streamId?: string  // Stream-Id trailer
  stage?: number     // Stage trailer
  batch?: string     // Batch trailer (e.g., "01.01")
  thread?: string    // Thread trailer (e.g., "01.01.01")
  task?: string      // Task trailer (e.g., "01.01.01.01")
}

/**
 * Parsed commit information from git log
 */
export interface ParsedCommit {
  sha: string
  shortSha: string
  author: string
  authorEmail: string
  date: string       // ISO format
  subject: string    // First line of commit message
  body: string       // Rest of commit message
  files: string[]    // Changed files
  trailers: WorkstreamTrailers
}

/**
 * Commits grouped by stage
 */
export interface CommitsByStage {
  stageNumber: number
  stageName?: string
  commits: ParsedCommit[]
}

// Delimiter for parsing git log output
const COMMIT_DELIMITER = "---COMMIT_BOUNDARY---"
const FIELD_DELIMITER = "---FIELD---"

/**
 * Parse git log output and extract commits for a branch
 *
 * @param repoRoot Repository root path
 * @param branchName Branch to get commits from (default: current branch)
 * @param baseBranch Base branch to compare against for new commits (optional)
 * @returns Array of parsed commits
 */
export function parseGitLog(
  repoRoot: string,
  branchName?: string,
  baseBranch?: string
): ParsedCommit[] {
  // Build the git log command with custom format
  // Format: SHA, short SHA, author, author email, date (ISO), subject, body
  const format = [
    "%H",       // Full SHA
    "%h",       // Short SHA
    "%an",      // Author name
    "%ae",      // Author email
    "%aI",      // Author date (ISO 8601)
    "%s",       // Subject (first line)
    "%b",       // Body (rest of message)
  ].join(FIELD_DELIMITER)

  // Build range specification
  let range = ""
  if (baseBranch && branchName) {
    range = `${baseBranch}..${branchName}`
  } else if (branchName) {
    range = branchName
  }

  try {
    // Get commit metadata
    const logOutput = execSync(
      `git log ${range} --format="${format}${COMMIT_DELIMITER}" --name-only`,
      {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large repos
      }
    ).trim()

    if (!logOutput) {
      return []
    }

    // Split into individual commits
    const commitBlocks = logOutput
      .split(COMMIT_DELIMITER)
      .filter((block) => block.trim())

    return commitBlocks.map((block) => parseCommitBlock(block))
  } catch (error) {
    const errorMessage = (error as Error).message || String(error)
    // Handle case where branch doesn't exist or no commits
    if (
      errorMessage.includes("unknown revision") ||
      errorMessage.includes("does not have any commits")
    ) {
      return []
    }
    throw new Error(`Failed to parse git log: ${errorMessage}`)
  }
}

/**
 * Parse a single commit block from git log output
 */
function parseCommitBlock(block: string): ParsedCommit {
  const lines = block.trim().split("\n")

  // First line contains the formatted commit info
  const metaLine = lines[0] || ""
  const parts = metaLine.split(FIELD_DELIMITER)

  const [sha, shortSha, author, authorEmail, date, subject, ...bodyParts] = parts

  // Body may contain FIELD_DELIMITER if commit message has special chars
  const body = bodyParts.join(FIELD_DELIMITER).trim()

  // Remaining lines are file names (from --name-only)
  // Skip empty lines between metadata and file list
  const files = lines
    .slice(1)
    .filter((line) => line.trim())
    .filter((line) => !line.includes(FIELD_DELIMITER)) // Skip any metadata remnants

  // Extract trailers from the body
  const trailers = extractWorkstreamTrailers(body)

  return {
    sha: sha || "",
    shortSha: shortSha || "",
    author: author || "",
    authorEmail: authorEmail || "",
    date: date || "",
    subject: subject || "",
    body,
    files,
    trailers,
  }
}

/**
 * Extract workstream trailers from a commit message
 *
 * Trailers are key-value pairs at the end of the commit message in the format:
 *   Key: Value
 *
 * Supported trailers:
 *   - Stream-Id: {streamId}
 *   - Stage: {stageNumber}
 *   - Batch: {batchId}
 *   - Thread: {threadId}
 *   - Task: {taskId}
 *
 * @param commitMessage Full commit message (or just body)
 * @returns Extracted workstream trailers
 */
export function extractWorkstreamTrailers(commitMessage: string): WorkstreamTrailers {
  const trailers: WorkstreamTrailers = {}

  if (!commitMessage) {
    return trailers
  }

  // Trailers are typically at the end of the message
  // They follow the pattern "Key: Value" on their own lines
  const lines = commitMessage.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()

    // Stream-Id trailer
    const streamIdMatch = trimmed.match(/^Stream-Id:\s*(.+)$/i)
    if (streamIdMatch) {
      trailers.streamId = streamIdMatch[1]!.trim()
      continue
    }

    // Stage trailer
    const stageMatch = trimmed.match(/^Stage:\s*(\d+)$/i)
    if (stageMatch) {
      trailers.stage = parseInt(stageMatch[1]!, 10)
      continue
    }

    // Batch trailer (e.g., "01.01")
    const batchMatch = trimmed.match(/^Batch:\s*(\d+\.\d+)$/i)
    if (batchMatch) {
      trailers.batch = batchMatch[1]!.trim()
      continue
    }

    // Thread trailer (e.g., "01.01.01")
    const threadMatch = trimmed.match(/^Thread:\s*(\d+\.\d+\.\d+)$/i)
    if (threadMatch) {
      trailers.thread = threadMatch[1]!.trim()
      continue
    }

    // Task trailer (e.g., "01.01.01.01")
    const taskMatch = trimmed.match(/^Task:\s*(\d+\.\d+\.\d+\.\d+)$/i)
    if (taskMatch) {
      trailers.task = taskMatch[1]!.trim()
      continue
    }
  }

  return trailers
}

/**
 * Check if a commit has any workstream trailers
 */
export function hasWorkstreamTrailers(trailers: WorkstreamTrailers): boolean {
  return !!(
    trailers.streamId ||
    trailers.stage !== undefined ||
    trailers.batch ||
    trailers.thread ||
    trailers.task
  )
}

/**
 * Group commits by stage for a specific workstream
 *
 * @param commits Array of parsed commits
 * @param streamId Workstream ID to filter by
 * @returns Commits grouped by stage number
 */
export function groupCommitsByStage(
  commits: ParsedCommit[],
  streamId: string
): CommitsByStage[] {
  // Filter commits for this workstream
  const workstreamCommits = commits.filter(
    (commit) => commit.trailers.streamId === streamId
  )

  // Group by stage number
  const stageMap = new Map<number, ParsedCommit[]>()

  for (const commit of workstreamCommits) {
    const stageNum = commit.trailers.stage

    if (stageNum !== undefined) {
      const existing = stageMap.get(stageNum) || []
      existing.push(commit)
      stageMap.set(stageNum, existing)
    }
  }

  // Convert to array and sort by stage number
  const result: CommitsByStage[] = []

  for (const [stageNumber, stageCommits] of stageMap.entries()) {
    result.push({
      stageNumber,
      commits: stageCommits,
    })
  }

  // Sort by stage number ascending
  result.sort((a, b) => a.stageNumber - b.stageNumber)

  return result
}

/**
 * Identify commits that don't have workstream trailers ("human" commits)
 *
 * These are commits made outside the workstream system - either manual
 * human commits or commits from other tools.
 *
 * @param commits Array of parsed commits
 * @returns Commits without workstream trailers
 */
export function identifyHumanCommits(commits: ParsedCommit[]): ParsedCommit[] {
  return commits.filter((commit) => !hasWorkstreamTrailers(commit.trailers))
}

/**
 * Get commits for a specific workstream
 *
 * @param commits Array of parsed commits
 * @param streamId Workstream ID to filter by
 * @returns Commits for the specified workstream
 */
export function getWorkstreamCommits(
  commits: ParsedCommit[],
  streamId: string
): ParsedCommit[] {
  return commits.filter((commit) => commit.trailers.streamId === streamId)
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(repoRoot: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()
  } catch {
    throw new Error("Failed to get current branch name")
  }
}

/**
 * Get the default branch name (main or master)
 */
export function getDefaultBranch(repoRoot: string): string {
  try {
    // Try to get from remote origin
    const remoteBranch = execSync(
      "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'",
      {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        shell: "/bin/bash",
      }
    ).trim()

    if (remoteBranch) {
      return remoteBranch
    }
  } catch {
    // Fall through to check local branches
  }

  // Check if main or master exists locally
  try {
    execSync("git rev-parse --verify main", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
    return "main"
  } catch {
    // main doesn't exist
  }

  try {
    execSync("git rev-parse --verify master", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
    return "master"
  } catch {
    // master doesn't exist
  }

  // Default to main
  return "main"
}
