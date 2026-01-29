// src/lib/opencode.ts
import { spawn } from "child_process";
var DEFAULT_PORT = 4096;
var HEALTH_CHECK_INTERVAL_MS = 200;
var DEFAULT_TIMEOUT_MS = 30000;
function getServerUrl(port = DEFAULT_PORT) {
  return `http://localhost:${port}`;
}
async function isServerRunning(port = DEFAULT_PORT) {
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      signal: AbortSignal.timeout(2000)
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}
function startServer(port = DEFAULT_PORT, cwd) {
  const child = spawn("opencode", ["serve", "--port", String(port)], {
    cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.unref();
  return child;
}
async function waitForServer(port = DEFAULT_PORT, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const running = await isServerRunning(port);
    if (running) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  return false;
}
function truncateTitle(title, maxLen = 32) {
  if (title.length <= maxLen)
    return title;
  return title.slice(0, maxLen - 1) + "…";
}
function getCompletionMarkerPath(threadId) {
  return `/tmp/workstream-${threadId}-complete.txt`;
}
function getSessionFilePath(threadId) {
  return `/tmp/workstream-${threadId}-session.txt`;
}
function getSynthesisOutputPath(streamId, threadId) {
  return `/tmp/workstream-${streamId}-${threadId}-synthesis.txt`;
}
function getWorkingAgentSessionPath(streamId, threadId) {
  return `/tmp/workstream-${streamId}-${threadId}-working-session.txt`;
}
function getSynthesisLogPath(streamId, threadId) {
  return `/tmp/workstream-${streamId}-${threadId}-synthesis.log`;
}
function escapeForShell(str) {
  return str.replace(/'/g, "'\\''").replace(/"/g, "\\\"").replace(/\$/g, "\\$").replace(/`/g, "\\`");
}
function buildRunCommand(port, model, promptPath, threadTitle, variant, threadId) {
  const escapedPath = promptPath.replace(/'/g, "'\\''");
  const truncated = truncateTitle(threadTitle, 32);
  const escapedTitle = escapeForShell(truncated);
  const variantFlag = variant ? ` --variant "${variant}"` : "";
  const completionMarkerCmd = threadId ? `
echo "done" > "${getCompletionMarkerPath(threadId)}"` : "";
  const sessionFilePath = threadId ? getSessionFilePath(threadId) : "";
  const writeSessionCmd = threadId ? `
    echo "$SESSION_ID" > "${sessionFilePath}"` : "";
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
'`;
}
var EARLY_FAILURE_THRESHOLD_SECONDS = 10;
function buildRetryRunCommand(port, models, promptPath, threadTitle, threadId) {
  if (models.length === 0) {
    throw new Error("At least one model must be provided");
  }
  if (models.length === 1) {
    const m = models[0];
    return buildRunCommand(port, m.model, promptPath, threadTitle, m.variant, threadId);
  }
  const escapedPath = promptPath.replace(/'/g, "'\\''");
  const truncated = truncateTitle(threadTitle, 32);
  const escapedTitle = escapeForShell(truncated);
  const modelAttempts = models.map((m, i) => {
    const variantFlag = m.variant ? ` --variant "${m.variant}"` : "";
    const isLast = i === models.length - 1;
    if (i === 0) {
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
  fi`;
    } else if (isLast) {
      return `
  if [ -z "$FINAL_EXIT" ]; then
    START_TIME=$(date +%s)
    echo "Trying model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
    cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$TITLE"
    FINAL_EXIT=$?
  fi`;
    } else {
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
  fi`;
    }
  }).join(`
`);
  const modelList = models.map((m) => m.variant ? `${m.model} (${m.variant})` : m.model).join(" -> ");
  const completionMarkerCmd = threadId ? `echo "done" > "${getCompletionMarkerPath(threadId)}"` : "";
  const sessionFilePath = threadId ? getSessionFilePath(threadId) : "";
  const writeSessionCmd = threadId ? `
    echo "$SESSION_ID" > "${sessionFilePath}"` : "";
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
'`;
}
function buildSynthesisRunCommand(options) {
  const {
    port,
    synthesisModels,
    workingModels,
    promptPath,
    threadTitle,
    streamId,
    threadId
  } = options;
  if (synthesisModels.length === 0) {
    throw new Error("At least one synthesis model must be provided");
  }
  if (workingModels.length === 0) {
    throw new Error("At least one working model must be provided");
  }
  const escapedPath = promptPath.replace(/'/g, "'\\''");
  const truncated = truncateTitle(threadTitle, 32);
  const escapedTitle = escapeForShell(truncated);
  const synthesisOutputPath = getSynthesisOutputPath(streamId, threadId);
  const workingSessionPath = getWorkingAgentSessionPath(streamId, threadId);
  const completionMarkerPath = getCompletionMarkerPath(threadId);
  const sessionFilePath = getSessionFilePath(threadId);
  const synthesisModelList = synthesisModels.map((m) => m.variant ? `${m.model} (${m.variant})` : m.model).join(" -> ");
  const workingModelList = workingModels.map((m) => m.variant ? `${m.model} (${m.variant})` : m.model).join(" -> ");
  const workingModelAttempts = buildWorkingAgentModelAttempts(port, workingModels, escapedPath);
  const synthesisModelAttempts = buildSynthesisModelAttempts(port, synthesisModels, escapedTitle, workingModelAttempts, workingSessionPath, synthesisOutputPath);
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
'`;
}
function buildWorkingAgentModelAttempts(port, models, escapedPath) {
  return models.map((m, i) => {
    const variantFlag = m.variant ? ` --variant \\"${m.variant}\\"` : "";
    const isLast = i === models.length - 1;
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
fi`;
    } else if (isLast) {
      return `
if [ -z \\"$WORK_FINAL_EXIT\\" ]; then
  echo \\"Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}\\"
  cat \\"${escapedPath}\\" | opencode run --port ${port} --model \\"${m.model}\\"${variantFlag} --title \\"$WORK_TITLE\\"
  WORK_FINAL_EXIT=$?
fi`;
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
fi`;
    }
  }).join(`
`);
}
function buildSynthesisPrompt(workingAgentCmd, workingSessionPath, synthesisOutputPath) {
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

Keep the summary concise (2-5 sentences).`;
}
function buildSynthesisModelAttempts(port, models, escapedTitle, workingAgentCmd, workingSessionPath, synthesisOutputPath) {
  const synthesisPrompt = buildSynthesisPrompt(workingAgentCmd, workingSessionPath, synthesisOutputPath);
  const escapedPrompt = synthesisPrompt.replace(/\\/g, "\\\\").replace(/'/g, "'\\''").replace(/"/g, "\\\"").replace(/\$/g, "\\$").replace(/`/g, "\\`");
  return models.map((m, i) => {
    const variantFlag = m.variant ? ` --variant "${m.variant}"` : "";
    const isLast = i === models.length - 1;
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
fi`;
    } else if (isLast) {
      return `
if [ -z "$FINAL_EXIT" ]; then
  echo "Starting synthesis agent (model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""})..."
  echo "${escapedPrompt}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$SYNTH_TITLE"
  FINAL_EXIT=$?
fi`;
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
fi`;
    }
  }).join(`
`);
}
function buildPostSynthesisCommand(options) {
  const {
    port,
    workingModels,
    synthesisModels,
    promptPath,
    threadTitle,
    streamId,
    threadId
  } = options;
  if (workingModels.length === 0) {
    throw new Error("At least one working model must be provided");
  }
  if (synthesisModels.length === 0) {
    throw new Error("At least one synthesis model must be provided");
  }
  const escapedPath = promptPath.replace(/'/g, "'\\''");
  const truncated = truncateTitle(threadTitle, 32);
  const escapedTitle = escapeForShell(truncated);
  const completionMarkerPath = getCompletionMarkerPath(threadId);
  const sessionFilePath = getSessionFilePath(threadId);
  const exportedSessionPath = `/tmp/workstream-${streamId}-${threadId}-exported-session.json`;
  const extractedContextPath = `/tmp/workstream-${streamId}-${threadId}-context.txt`;
  const synthesisJsonPath = `/tmp/workstream-${streamId}-${threadId}-synthesis.json`;
  const synthesisLogPath = getSynthesisLogPath(streamId, threadId);
  const workingModelList = workingModels.map((m) => m.variant ? `${m.model} (${m.variant})` : m.model).join(" -> ");
  const synthesisModelList = synthesisModels.map((m) => m.variant ? `${m.model} (${m.variant})` : m.model).join(" -> ");
  const workingModelAttempts = buildPostSynthesisWorkingAgentAttempts(port, workingModels, escapedPath);
  const synthesisModelAttempts = buildPostSynthesisSynthesisAgentAttempts(port, synthesisModels, extractedContextPath, synthesisJsonPath);
  const jqExtractCommand = `jq -r ".messages[] | select(.info.role==\\"assistant\\") | .parts[] | select(.type==\\"text\\") | .text"`;
  return `sh -c '
WORK_TRACK_ID=$(date +%s%N | head -c 16)
WORK_TITLE="${escapedTitle}__work_id=$WORK_TRACK_ID"
WORK_FINAL_EXIT=""
SYNTH_FINAL_EXIT=""
echo "════════════════════════════════════════"
echo "Thread: ${escapedTitle}"
echo "Mode: Post-Session Synthesis"
echo "Working Models: ${workingModelList}"
echo "Synthesis Models: ${synthesisModelList}"
echo "════════════════════════════════════════"
echo ""

# Phase 1: Run working agent with full TUI
echo "▶ Phase 1: Running working agent..."
echo ""
${workingModelAttempts}

echo ""
echo "Working agent finished (exit: $WORK_FINAL_EXIT)."
echo ""

# Find working agent session ID by tracking ID
WORK_SESSION_ID=""
if command -v jq >/dev/null 2>&1; then
  WORK_SESSION_ID=$(opencode session list --max-count 20 --format json 2>/dev/null | jq -r ".[] | select(.title | contains(\\"__work_id=$WORK_TRACK_ID\\")) | .id" | head -1)
fi

if [ -z "$WORK_SESSION_ID" ]; then
  echo "Warning: Could not find working agent session ID."
  echo "Synthesis will run without session context."
else
  echo "Found working session: $WORK_SESSION_ID"
  
  # Export session to JSON
  echo "Exporting session..."
  opencode export "$WORK_SESSION_ID" > "${exportedSessionPath}" 2>/dev/null
  
  # Extract assistant text messages using jq
  echo "Extracting context..."
  ${jqExtractCommand} "${exportedSessionPath}" > "${extractedContextPath}" 2>/dev/null
fi

# Phase 2: Run synthesis agent headless
echo ""
echo "▶ Phase 2: Running synthesis agent (headless)..."
echo ""
${synthesisModelAttempts}

echo ""
echo "Synthesis complete."

# Log synthesis metadata
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") Synthesis finished" >> "${synthesisLogPath}"
if [ -f "${synthesisJsonPath}" ]; then
  FILE_SIZE=$(wc -c < "${synthesisJsonPath}" 2>/dev/null || echo "0")
  echo "Synthesis output size: $FILE_SIZE bytes" >> "${synthesisLogPath}"
fi

# Write completion marker AFTER synthesis completes
# This ensures synthesis output is available when notification fires
echo "done" > "${completionMarkerPath}"

# Save working session ID for workstream tracking
if [ -n "$WORK_SESSION_ID" ]; then
  echo "$WORK_SESSION_ID" > "${sessionFilePath}"
fi

# Resume WORKING agent session (not synthesis)
echo ""
echo "Opening working session for review..."
if [ -n "$WORK_SESSION_ID" ]; then
  opencode --session "$WORK_SESSION_ID"
else
  echo "No working session available. Press Enter to close."
  read
fi
'`;
}
function buildPostSynthesisWorkingAgentAttempts(port, models, escapedPath) {
  return models.map((m, i) => {
    const variantFlag = m.variant ? ` --variant "${m.variant}"` : "";
    const isLast = i === models.length - 1;
    if (i === 0) {
      return `
START_TIME=$(date +%s)
echo "Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$WORK_TITLE"
WORK_EXIT=$?
ELAPSED=$(($(date +%s) - START_TIME))
if [ $WORK_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
  WORK_FINAL_EXIT=$WORK_EXIT
else
  echo ""
  echo "Working model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s (exit: $WORK_EXIT). Trying next..."
fi`;
    } else if (isLast) {
      return `
if [ -z "$WORK_FINAL_EXIT" ]; then
  echo "Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
  cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$WORK_TITLE"
  WORK_FINAL_EXIT=$?
fi`;
    } else {
      return `
if [ -z "$WORK_FINAL_EXIT" ]; then
  START_TIME=$(date +%s)
  echo "Trying working model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
  cat "${escapedPath}" | opencode run --port ${port} --model "${m.model}"${variantFlag} --title "$WORK_TITLE"
  WORK_EXIT=$?
  ELAPSED=$(($(date +%s) - START_TIME))
  if [ $WORK_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
    WORK_FINAL_EXIT=$WORK_EXIT
  else
    echo ""
    echo "Working model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s (exit: $WORK_EXIT). Trying next..."
  fi
fi`;
    }
  }).join(`
`);
}
function buildPostSynthesisSynthesisAgentAttempts(port, models, contextPath, outputJsonPath) {
  return models.map((m, i) => {
    const variantFlag = m.variant ? ` --variant "${m.variant}"` : "";
    const isLast = i === models.length - 1;
    const synthCommand = `(echo "You are a synthesis agent reviewing a completed working agent session. Use the synthesizing-workstreams skill to continue"; echo ""; echo "## Working Agent Session Context"; echo ""; echo "The working agent session context follows below. Analyze it and provide your summary."; echo ""; cat "${contextPath}" 2>/dev/null || echo "(no context available)") | opencode run --port ${port} --model "${m.model}"${variantFlag} --format json > "${outputJsonPath}" 2>&1`;
    if (i === 0) {
      return `
START_TIME=$(date +%s)
echo "Trying synthesis model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
${synthCommand}
SYNTH_EXIT=$?
ELAPSED=$(($(date +%s) - START_TIME))
if [ $SYNTH_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
  SYNTH_FINAL_EXIT=$SYNTH_EXIT
else
  echo ""
  echo "Synthesis model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s (exit: $SYNTH_EXIT). Trying next..."
fi`;
    } else if (isLast) {
      return `
if [ -z "$SYNTH_FINAL_EXIT" ]; then
  echo "Trying synthesis model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
  ${synthCommand}
  SYNTH_FINAL_EXIT=$?
fi`;
    } else {
      return `
if [ -z "$SYNTH_FINAL_EXIT" ]; then
  START_TIME=$(date +%s)
  echo "Trying synthesis model ${i + 1}/${models.length}: ${m.model}${m.variant ? ` (variant: ${m.variant})` : ""}"
  ${synthCommand}
  SYNTH_EXIT=$?
  ELAPSED=$(($(date +%s) - START_TIME))
  if [ $SYNTH_EXIT -eq 0 ] || [ $ELAPSED -ge ${EARLY_FAILURE_THRESHOLD_SECONDS} ]; then
    SYNTH_FINAL_EXIT=$SYNTH_EXIT
  else
    echo ""
    echo "Synthesis model failed within ${EARLY_FAILURE_THRESHOLD_SECONDS}s (exit: $SYNTH_EXIT). Trying next..."
  fi
fi`;
    }
  }).join(`
`);
}
function buildServeCommand(port = DEFAULT_PORT) {
  return `opencode serve --port ${port}`;
}
export {
  waitForServer,
  startServer,
  isServerRunning,
  getWorkingAgentSessionPath,
  getSynthesisOutputPath,
  getSynthesisLogPath,
  getSessionFilePath,
  getServerUrl,
  getCompletionMarkerPath,
  buildSynthesisRunCommand,
  buildServeCommand,
  buildRunCommand,
  buildRetryRunCommand,
  buildPostSynthesisCommand
};
