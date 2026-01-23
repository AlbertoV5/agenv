/**
 * opencode server management utilities
 *
 * Provides functions for starting, checking, and managing the opencode serve
 * backend which allows multiple client instances to share MCP and model cache.
 */

import { spawn, type ChildProcess } from "child_process"

const DEFAULT_PORT = 4096
const HEALTH_CHECK_INTERVAL_MS = 200
const DEFAULT_TIMEOUT_MS = 30000

/**
 * Get the server URL for a given port
 */
export function getServerUrl(port: number = DEFAULT_PORT): string {
  return `http://localhost:${port}`
}

/**
 * Check if the opencode server is running on the specified port
 * Makes a simple HTTP request to verify the server is responsive
 */
export async function isServerRunning(
  port: number = DEFAULT_PORT,
): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    })
    // Any response means the server is up (even if not 200)
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

/**
 * Start the opencode server in the background
 * Returns the child process handle
 *
 * Note: The process is started detached so it continues running
 * after the parent process exits.
 */
export function startServer(
  port: number = DEFAULT_PORT,
  cwd?: string,
): ChildProcess {
  const child = spawn("opencode", ["serve", "--port", String(port)], {
    cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })

  // Unref so parent can exit while server continues
  child.unref()

  return child
}

/**
 * Wait for the server to become available
 * Polls until the server responds or timeout is reached
 */
export async function waitForServer(
  port: number = DEFAULT_PORT,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const running = await isServerRunning(port)
    if (running) {
      return true
    }
    // Wait before next check
    await new Promise((resolve) =>
      setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS),
    )
  }

  return false
}

/**
 * Truncate a string to maxLen chars, adding ellipsis if truncated
 */
function truncateTitle(title: string, maxLen: number = 32): string {
  if (title.length <= maxLen) return title
  return title.slice(0, maxLen - 1) + "…"
}

/**
 * Get the marker file path for a thread's first command completion
 * Used to signal when opencode run finishes (before session resume)
 * 
 * @param threadId - Thread ID (e.g., "01.01.02")
 * @returns Path to the completion marker file
 */
export function getCompletionMarkerPath(threadId: string): string {
  return `/tmp/workstream-${threadId}-complete.txt`
}

/**
 * Get the session file path for storing the opencode session ID
 * Used to capture the actual opencode session ID for workstream tracking
 * 
 * @param threadId - Thread ID (e.g., "01.01.02")
 * @returns Path to the session ID file
 */
export function getSessionFilePath(threadId: string): string {
  return `/tmp/workstream-${threadId}-session.txt`
}

/**
 * Get the synthesis output file path for capturing synthesis agent output
 * Used for the synthesis agent to write its summary output
 * 
 * @param streamId - Stream/workstream ID (e.g., "001-my-workstream")
 * @param threadId - Thread ID (e.g., "01.01.02")
 * @returns Absolute path to the synthesis output file in /tmp
 */
export function getSynthesisOutputPath(streamId: string, threadId: string): string {
  return `/tmp/workstream-${streamId}-${threadId}-synthesis.txt`
}

/**
 * Get the working agent session file path for synthesis mode
 * Used to capture the inner working agent's session ID
 * 
 * @param streamId - Stream/workstream ID (e.g., "001-my-workstream")
 * @param threadId - Thread ID (e.g., "01.01.02")
 * @returns Path to the working agent session file
 */
export function getWorkingAgentSessionPath(streamId: string, threadId: string): string {
  return `/tmp/workstream-${streamId}-${threadId}-working-session.txt`
}

/**
 * Escape a string for use in shell commands wrapped in sh -c '...'
 * Handles both the outer single-quote wrapper and inner double-quoted strings
 */
function escapeForShell(str: string): string {
  // First escape single quotes for the outer sh -c '...' wrapper
  // Then escape double quotes, $, and backticks for inner double-quoted strings
  return str
    .replace(/'/g, "'\\''")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")
}

/**
 * Build the opencode run command with --title flag and session resume logic
 * Wrapped in sh -c to properly handle piped commands in tmux
 *
 * The command:
 * 1. Generates a unique tracking ID
 * 2. Runs opencode with a title containing the tracking ID
 * 3. Writes a completion marker file to signal first command done (for notification timing)
 * 4. After completion, searches for the session by tracking ID
 * 5. Writes the session ID to a temp file for workstream tracking (if threadId provided)
 * 6. Resumes the session with opencode TUI if found
 * 
 * @param threadId - Optional thread ID for completion marker (e.g., "01.01.02")
 */
export function buildRunCommand(
  port: number,
  model: string,
  promptPath: string,
  threadTitle: string,
  variant?: string,
  threadId?: string,
): string {
  // Escape single quotes in paths by replacing ' with '\''
  const escapedPath = promptPath.replace(/'/g, "'\\''")
  // Truncate and escape the title for shell safety
  const truncated = truncateTitle(threadTitle, 32)
  const escapedTitle = escapeForShell(truncated)

  // Build variant flag if specified
  const variantFlag = variant ? ` --variant "${variant}"` : ""

  // Build completion marker path if threadId provided
  const completionMarkerCmd = threadId
    ? `\necho "done" > "${getCompletionMarkerPath(threadId)}"`
    : ""

  // Build session file write command if threadId provided
  const sessionFilePath = threadId ? getSessionFilePath(threadId) : ""
  const writeSessionCmd = threadId
    ? `\n    echo "$SESSION_ID" > "${sessionFilePath}"`
    : ""

  // Build a shell script that:
  // 1. Generates a unique tracking ID (16 chars from nanosecond timestamp)
  // 2. Runs opencode run with the title containing the tracking ID
  // 3. Writes completion marker file (if threadId provided)
  // 4. After completion, searches for the session by tracking ID using jq
  // 5. Writes the session ID to a temp file for workstream tracking (if threadId provided)
  // 6. Resumes the session with opencode TUI if found
  return `sh -c '
TRACK_ID=$(date +%s%N | head -c 16)
TITLE="${escapedTitle}__id=$TRACK_ID"
echo "════════════════════════════════════════"
echo "Thread: ${escapedTitle}"
echo "Model: ${model}${variant ? ` (${variant})` : ""}"
echo "════════════════════════════════════════"
echo ""
cat "${escapedPath}" | opencode run --port ${port} --model "${model}"${variantFlag} --title "$TITLE"${completionMarkerCmd}
echo ""
echo "Thread finished. Looking for session to resume..."
if command -v jq >/dev/null 2>&1; then
  SESSION_ID=$(opencode session list --max-count 20 --format json 2>/dev/null | jq -r ".[] | select(.title | contains(\\"__id=$TRACK_ID\\")) | .id" | head -1)
  if [ -n "$SESSION_ID" ]; then${writeSessionCmd}
    echo "Resuming session $SESSION_ID..."
    opencode --session "$SESSION_ID"
  else
    echo "Session not found. Press Enter to close."
    read
  fi
else
  echo "jq not found - install jq to enable session resume"
  echo "Press Enter to close."
  read
fi
'`
}

import type { NormalizedModelSpec } from "./types.ts"

/** Early failure threshold in seconds - retry only if exit happens faster than this */
const EARLY_FAILURE_THRESHOLD_SECONDS = 10

/**
 * Build the opencode run command with retry logic for multiple models
 *
 * Retry logic:
 * - Only retries if opencode exits within EARLY_FAILURE_THRESHOLD_SECONDS (early failure)
 * - Tries each model in order until one succeeds or runs past the threshold
 * - Session resume logic is NOT wrapped in retry (user Ctrl+C exits normally)
 * - Writes completion marker file after first command finishes (if threadId provided)
 *
 * @param threadId - Optional thread ID for completion marker (e.g., "01.01.02")
 */
export function buildRetryRunCommand(
  port: number,
  models: NormalizedModelSpec[],
  promptPath: string,
  threadTitle: string,
  threadId?: string,
): string {
  if (models.length === 0) {
    throw new Error("At least one model must be provided")
  }

  // If only one model, use simple command without retry logic
  if (models.length === 1) {
    const m = models[0]!
    return buildRunCommand(port, m.model, promptPath, threadTitle, m.variant, threadId)
  }

  // Escape single quotes in paths by replacing ' with '\''
  const escapedPath = promptPath.replace(/'/g, "'\\''")
  // Truncate and escape the title for shell safety
  const truncated = truncateTitle(threadTitle, 32)
  const escapedTitle = escapeForShell(truncated)

  // Build model attempt blocks
  const modelAttempts = models
    .map((m, i) => {
      const variantFlag = m.variant ? ` --variant "${m.variant}"` : ""
      const isLast = i === models.length - 1

      if (i === 0) {
        // First model - always try
        return `
  START_TIME=$(date +%s)
  echo "Trying model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
  cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$TITLE"
  EXIT_CODE=$?
  ELAPSED=$(($(date +%s) - START_TIME))
  
  if [ $EXIT_CODE -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
    FINAL_EXIT=$EXIT_CODE
  else
    echo ""
    echo "Model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s (exit code: $EXIT_CODE, elapsed: \${ELAPSED}s). Trying next model..."
  fi`
      } else if (isLast) {
        // Last model - no retry after this
        return `
  if [ -z "$FINAL_EXIT" ]; then
    START_TIME=$(date +%s)
    echo "Trying model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
    cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$TITLE"
    FINAL_EXIT=$?
  fi`
      } else {
        // Middle models - check if should retry
        return `
  if [ -z "$FINAL_EXIT" ]; then
    START_TIME=$(date +%s)
    echo "Trying model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
    cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$TITLE"
    EXIT_CODE=$?
    ELAPSED=$(($(date +%s) - START_TIME))
    
    if [ $EXIT_CODE -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
      FINAL_EXIT=$EXIT_CODE
    else
      echo ""
      echo "Model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s (exit code: $EXIT_CODE, elapsed: \${ELAPSED}s). Trying next model..."
    fi
  fi`
      }
    })
    .join("\n")

  const modelList = models.map(m => m.variant ? `${m.model} (${m.variant})` : m.model).join(" -> ")

  // Build completion marker command if threadId provided
  const completionMarkerCmd = threadId
    ? `echo "done" > "${getCompletionMarkerPath(threadId)}"`
    : ""

  // Build session file write command if threadId provided
  const sessionFilePath = threadId ? getSessionFilePath(threadId) : ""
  const writeSessionCmd = threadId
    ? `\n    echo "$SESSION_ID" > "${sessionFilePath}"`
    : ""

  return `sh -c '
TRACK_ID=$(date +%s%N | head -c 16)
TITLE="${escapedTitle}__id=$TRACK_ID"
FINAL_EXIT=""
echo "════════════════════════════════════════"
echo "Thread: ${escapedTitle}"
echo "Models: ${modelList}"
echo "════════════════════════════════════════"
echo ""
${modelAttempts}
${completionMarkerCmd}
echo ""
echo "Thread finished. Looking for session to resume..."
if command -v jq >/dev/null 2>&1; then
  SESSION_ID=$(opencode session list --max-count 20 --format json 2>/dev/null | jq -r ".[] | select(.title | contains(\\"__id=$TRACK_ID\\")) | .id" | head -1)
  if [ -n "$SESSION_ID" ]; then${writeSessionCmd}
    echo "Resuming session $SESSION_ID..."
    opencode --session "$SESSION_ID"
  else
    echo "Session not found. Press Enter to close."
    read
  fi
else
  echo "jq not found - install jq to enable session resume"
  echo "Press Enter to close."
  read
fi
'`
}

/**
 * Options for building synthesis run command
 */
export interface SynthesisRunOptions {
  port: number
  /** Models for the synthesis agent (outer agent) */
  synthesisModels: NormalizedModelSpec[]
  /** Models for the working agent (inner agent) */
  workingModels: NormalizedModelSpec[]
  /** Path to the prompt file for the working agent */
  promptPath: string
  /** Thread title for display */
  threadTitle: string
  /** Stream/workstream ID for file paths */
  streamId: string
  /** Thread ID for file paths */
  threadId: string
}

/**
 * Build the opencode run command with synthesis agent wrapping
 *
 * This creates a two-level agent execution:
 * 1. Outer: Synthesis agent that orchestrates and summarizes
 * 2. Inner: Working agent that executes the actual task
 *
 * Flow:
 * - Generate unique tracking IDs for both agents
 * - Synthesis agent receives prompt with working agent command embedded
 * - Working agent executes the task (via opencode run)
 * - Synthesis agent summarizes after working agent completes
 * - Output written to synthesis output file for capture
 *
 * Error Handling:
 * - If synthesis agent fails, still capture working agent session ID if available
 * - If working agent crashes, synthesis agent notes this in summary
 * - If synthesis output file is empty/missing, consumers should log warning but not fail
 *
 * @param options - Synthesis run configuration
 * @returns Shell command string for tmux execution
 * @throws Error if no synthesis models or working models are provided
 */
export function buildSynthesisRunCommand(options: SynthesisRunOptions): string {
  const {
    port,
    synthesisModels,
    workingModels,
    promptPath,
    threadTitle,
    streamId,
    threadId,
  } = options

  if (synthesisModels.length === 0) {
    throw new Error("At least one synthesis model must be provided")
  }
  if (workingModels.length === 0) {
    throw new Error("At least one working model must be provided")
  }

  // Escape paths and title for shell safety
  const escapedPath = promptPath.replace(/'/g, "'\\''")
  const truncated = truncateTitle(threadTitle, 32)
  const escapedTitle = escapeForShell(truncated)

  // File paths for tracking
  const synthesisOutputPath = getSynthesisOutputPath(streamId, threadId)
  const workingSessionPath = getWorkingAgentSessionPath(streamId, threadId)
  const completionMarkerPath = getCompletionMarkerPath(threadId)
  const sessionFilePath = getSessionFilePath(threadId)

  // Build model lists for display
  const synthesisModelList = synthesisModels
    .map((m) => (m.variant ? `${m.model} (${m.variant})` : m.model))
    .join(" -> ")
  const workingModelList = workingModels
    .map((m) => (m.variant ? `${m.model} (${m.variant})` : m.model))
    .join(" -> ")

  // Build the working agent command that synthesis agent will execute
  // This is a simplified version without session resume (synthesis agent handles that)
  const workingModelAttempts = buildWorkingAgentModelAttempts(
    port,
    workingModels,
    escapedPath,
  )

  // Build synthesis model attempts for the outer agent
  const synthesisModelAttempts = buildSynthesisModelAttempts(
    port,
    synthesisModels,
    escapedTitle,
    workingModelAttempts,
    workingSessionPath,
    synthesisOutputPath,
  )

  return `sh -c '
SYNTH_TRACK_ID=$(date +%s%N | head -c 16)
WORK_TRACK_ID=$(date +%s%N | tail -c 16 | head -c 16)
SYNTH_TITLE="${escapedTitle}__synth_id=$SYNTH_TRACK_ID"
WORK_TITLE="${escapedTitle}__work_id=$WORK_TRACK_ID"
FINAL_EXIT=""
echo "════════════════════════════════════════"
echo "Thread: ${escapedTitle}"
echo "Mode: Synthesis"
echo "Synthesis Models: ${synthesisModelList}"
echo "Working Models: ${workingModelList}"
echo "════════════════════════════════════════"
echo ""

# Initialize output files
echo "" > "${synthesisOutputPath}"
echo "" > "${workingSessionPath}"

${synthesisModelAttempts}

# Write completion marker
echo "done" > "${completionMarkerPath}"

echo ""
echo "Synthesis complete. Looking for session to resume..."
if command -v jq >/dev/null 2>&1; then
  # Try to find synthesis agent session first
  SESSION_ID=$(opencode session list --max-count 30 --format json 2>/dev/null | jq -r ".[] | select(.title | contains(\\"__synth_id=$SYNTH_TRACK_ID\\")) | .id" | head -1)
  if [ -n "$SESSION_ID" ]; then
    echo "$SESSION_ID" > "${sessionFilePath}"
    echo "Resuming synthesis session $SESSION_ID..."
    opencode --session "$SESSION_ID"
  else
    # Fallback: try working agent session
    WORK_SESSION_ID=$(cat "${workingSessionPath}" 2>/dev/null | tr -d "\\n")
    if [ -n "$WORK_SESSION_ID" ]; then
      echo "$WORK_SESSION_ID" > "${sessionFilePath}"
      echo "Resuming working session $WORK_SESSION_ID..."
      opencode --session "$WORK_SESSION_ID"
    else
      echo "No session found. Press Enter to close."
      read
    fi
  fi
else
  echo "jq not found - install jq to enable session resume"
  echo "Press Enter to close."
  read
fi
'`
}

/**
 * Build the working agent model attempts (inner loop for synthesis)
 * This is a simplified version that doesn't include session resume
 */
function buildWorkingAgentModelAttempts(
  port: number,
  models: NormalizedModelSpec[],
  escapedPath: string,
): string {
  return models
    .map((m, i) => {
      const variantFlag = m.variant ? ` --variant \\"${m.variant}\\"` : ""
      const isLast = i === models.length - 1

      if (i === 0) {
        return `
START_TIME=$(date +%s)
echo \\"Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}\\"
cat \\"${escapedPath}\\" | opencode run --port ${port} --model \\"${m.model}\\"${variantFlag} --title \\"$WORK_TITLE\\"
WORK_EXIT=$?
ELAPSED=$(($(date +%s) - START_TIME))
if [ $WORK_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
  WORK_FINAL_EXIT=$WORK_EXIT
else
  echo \\"\\"
  echo \\"Working model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s. Trying next...\\"
fi`
      } else if (isLast) {
        return `
if [ -z \\"$WORK_FINAL_EXIT\\" ]; then
  echo \\"Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}\\"
  cat \\"${escapedPath}\\" | opencode run --port ${port} --model \\"${m.model}\\"${variantFlag} --title \\"$WORK_TITLE\\"
  WORK_FINAL_EXIT=$?
fi`
      } else {
        return `
if [ -z \\"$WORK_FINAL_EXIT\\" ]; then
  START_TIME=$(date +%s)
  echo \\"Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}\\"
  cat \\"${escapedPath}\\" | opencode run --port ${port} --model \\"${m.model}\\"${variantFlag} --title \\"$WORK_TITLE\\"
  WORK_EXIT=$?
  ELAPSED=$(($(date +%s) - START_TIME))
  if [ $WORK_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
    WORK_FINAL_EXIT=$WORK_EXIT
  else
    echo \\"\\"
    echo \\"Working model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s. Trying next...\\"
  fi
fi`
      }
    })
    .join("\n")
}

/**
 * Build the synthesis prompt that instructs synthesis agent to:
 * 1. Execute the working agent command
 * 2. Capture the working agent session ID
 * 3. Summarize the results after completion
 */
function buildSynthesisPrompt(
  workingAgentCmd: string,
  workingSessionPath: string,
  synthesisOutputPath: string,
): string {
  // The synthesis prompt tells the synthesis agent what to do
  // It will be piped to the synthesis agent via stdin
  return `You are a synthesis agent orchestrating a working agent session.

## Your Tasks

1. **Execute the working agent**: Run the following shell command to spawn the working agent:

\\\`\\\`\\\`bash
${workingAgentCmd}
\\\`\\\`\\\`

2. **Capture session ID**: After the working agent completes, find its session ID and save it:

\\\`\\\`\\\`bash
# Find working agent session by tracking ID
WORK_SESSION=$(opencode session list --max-count 20 --format json 2>/dev/null | jq -r '.[] | select(.title | contains("__work_id=")) | .id' | head -1)
echo "$WORK_SESSION" > "${workingSessionPath}"
\\\`\\\`\\\`

3. **Summarize results**: Review what the working agent accomplished and write a brief summary to the synthesis output file:

\\\`\\\`\\\`bash
echo "YOUR_SUMMARY_HERE" > "${synthesisOutputPath}"
\\\`\\\`\\\`

## Error Handling

- If the working agent fails or crashes, note this in your summary
- Always try to capture the working agent session ID, even on failure
- Write something to the synthesis output file even if it's just an error note

## Summary Guidelines

Your summary should include:
- What task was assigned to the working agent
- Whether it completed successfully
- Key changes or outcomes (if any)
- Any errors or issues encountered

Keep the summary concise (2-5 sentences).`
}

/**
 * Build the synthesis model attempts (outer loop)
 */
function buildSynthesisModelAttempts(
  port: number,
  models: NormalizedModelSpec[],
  escapedTitle: string,
  workingAgentCmd: string,
  workingSessionPath: string,
  synthesisOutputPath: string,
): string {
  // Build the synthesis prompt
  const synthesisPrompt = buildSynthesisPrompt(
    workingAgentCmd,
    workingSessionPath,
    synthesisOutputPath,
  )

  // Escape the prompt for shell embedding (it will be echo'd)
  const escapedPrompt = synthesisPrompt
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")

  return models
    .map((m, i) => {
      const variantFlag = m.variant ? ` --variant "${m.variant}"` : ""
      const isLast = i === models.length - 1

      if (i === 0) {
        return `
START_TIME=$(date +%s)
echo "Starting synthesis agent (model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""})..."
echo "${escapedPrompt}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$SYNTH_TITLE"
SYNTH_EXIT=$?
ELAPSED=$(($(date +%s) - START_TIME))
if [ $SYNTH_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
  FINAL_EXIT=$SYNTH_EXIT
else
  echo ""
  echo "Synthesis model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s. Trying next..."
fi`
      } else if (isLast) {
        return `
if [ -z "$FINAL_EXIT" ]; then
  echo "Starting synthesis agent (model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""})..."
  echo "${escapedPrompt}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$SYNTH_TITLE"
  FINAL_EXIT=$?
fi`
      } else {
        return `
if [ -z "$FINAL_EXIT" ]; then
  START_TIME=$(date +%s)
  echo "Starting synthesis agent (model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""})..."
  echo "${escapedPrompt}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$SYNTH_TITLE"
  SYNTH_EXIT=$?
  ELAPSED=$(($(date +%s) - START_TIME))
  if [ $SYNTH_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
    FINAL_EXIT=$SYNTH_EXIT
  else
    echo ""
    echo "Synthesis model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s. Trying next..."
  fi
fi`
      }
    })
    .join("\n")
}

/**
 * Build the opencode serve command for display (dry-run mode)
 */
export function buildServeCommand(port: number = DEFAULT_PORT): string {
  return `opencode serve --port ${port}`
}
