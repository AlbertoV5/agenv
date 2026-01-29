// src/lib/marker-polling.ts
import { existsSync as existsSync2, unlinkSync } from "fs";

// src/lib/opencode.ts
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

// src/lib/synthesis/output.ts
import { readFileSync, appendFileSync, existsSync } from "node:fs";
function parseSynthesisJsonl(content) {
  const logs = [];
  const textParts = [];
  let success = true;
  logs.push(`Starting JSONL parse (${content.length} bytes)`);
  const lines = content.split(`
`).filter((line) => line.trim() !== "");
  logs.push(`Found ${lines.length} non-empty lines`);
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    if (!line)
      continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "text") {
        const textEvent = event;
        if (textEvent.part?.text) {
          textParts.push(textEvent.part.text);
          logs.push(`Line ${i + 1}: Extracted text (${textEvent.part.text.length} chars)`);
        } else {
          logs.push(`Line ${i + 1}: Text event missing part.text field`);
        }
      } else {
        logs.push(`Line ${i + 1}: Skipped event type "${event.type}"`);
      }
    } catch (error) {
      logs.push(`Line ${i + 1}: JSON parse error - ${error instanceof Error ? error.message : String(error)}`);
      success = false;
    }
  }
  const text = textParts.join("");
  logs.push(`Parsing complete: ${textParts.length} text parts, ${text.length} total chars`);
  return {
    text,
    logs,
    success
  };
}
function parseSynthesisOutputFile(filePath, logPath) {
  const logs = [];
  try {
    if (!existsSync(filePath)) {
      logs.push(`ERROR: File not found: ${filePath}`);
      return {
        text: "",
        logs,
        success: false
      };
    }
    logs.push(`Reading file: ${filePath}`);
    const content = readFileSync(filePath, "utf-8");
    logs.push(`Read ${content.length} bytes`);
    const result = parseSynthesisJsonl(content);
    const allLogs = [...logs, ...result.logs];
    if (logPath) {
      try {
        const logContent = allLogs.join(`
`) + `
`;
        appendFileSync(logPath, logContent);
        allLogs.push(`Debug logs written to: ${logPath}`);
      } catch (error) {
        allLogs.push(`WARNING: Failed to write logs to ${logPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return {
      text: result.text,
      logs: allLogs,
      success: result.success
    };
  } catch (error) {
    logs.push(`ERROR: Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    return {
      text: "",
      logs,
      success: false
    };
  }
}

// src/lib/marker-polling.ts
function cleanupCompletionMarkers(threadIds) {
  for (const threadId of threadIds) {
    const markerPath = getCompletionMarkerPath(threadId);
    try {
      if (existsSync2(markerPath)) {
        unlinkSync(markerPath);
      }
    } catch {}
  }
}
function cleanupSessionFiles(threadIds) {
  for (const threadId of threadIds) {
    const sessionPath = getSessionFilePath(threadId);
    try {
      if (existsSync2(sessionPath)) {
        unlinkSync(sessionPath);
      }
    } catch {}
  }
}
function cleanupSynthesisFiles(streamId, threadIds) {
  for (const threadId of threadIds) {
    const synthesisPath = getSynthesisOutputPath(streamId, threadId);
    try {
      if (existsSync2(synthesisPath)) {
        unlinkSync(synthesisPath);
      }
    } catch {}
    const synthesisJsonPath = `/tmp/workstream-${streamId}-${threadId}-synthesis.json`;
    try {
      if (existsSync2(synthesisJsonPath)) {
        unlinkSync(synthesisJsonPath);
      }
    } catch {}
    const synthesisLogPath = getSynthesisLogPath(streamId, threadId);
    try {
      if (existsSync2(synthesisLogPath)) {
        unlinkSync(synthesisLogPath);
      }
    } catch {}
    const exportedSessionPath = `/tmp/workstream-${streamId}-${threadId}-exported-session.json`;
    try {
      if (existsSync2(exportedSessionPath)) {
        unlinkSync(exportedSessionPath);
      }
    } catch {}
    const extractedContextPath = `/tmp/workstream-${streamId}-${threadId}-context.txt`;
    try {
      if (existsSync2(extractedContextPath)) {
        unlinkSync(extractedContextPath);
      }
    } catch {}
    const workingSessionPath = getWorkingAgentSessionPath(streamId, threadId);
    try {
      if (existsSync2(workingSessionPath)) {
        unlinkSync(workingSessionPath);
      }
    } catch {}
  }
}
function createPollingState() {
  return {
    active: true,
    completedThreadIds: new Set
  };
}
async function pollMarkerFiles(config, state) {
  const { threadIds, notificationTracker, pollIntervalMs = 500, streamId } = config;
  while (state.active) {
    for (const threadId of threadIds) {
      if (state.completedThreadIds.has(threadId))
        continue;
      const markerPath = getCompletionMarkerPath(threadId);
      if (existsSync2(markerPath)) {
        state.completedThreadIds.add(threadId);
        let synthesisOutput;
        if (streamId) {
          const synthesisJsonPath = `/tmp/workstream-${streamId}-${threadId}-synthesis.json`;
          const synthesisLogPath = getSynthesisLogPath(streamId, threadId);
          if (existsSync2(synthesisJsonPath)) {
            try {
              const result = parseSynthesisOutputFile(synthesisJsonPath, synthesisLogPath);
              if (result.success && result.text) {
                synthesisOutput = result.text.trim();
              }
            } catch {}
          }
        }
        if (synthesisOutput) {
          notificationTracker?.playSynthesisComplete(threadId, synthesisOutput);
        } else {
          notificationTracker?.playThreadComplete(threadId);
        }
      }
    }
    if (state.completedThreadIds.size === threadIds.length && threadIds.length > 0) {
      await Bun.sleep(100);
      notificationTracker?.playBatchComplete();
      state.active = false;
      break;
    }
    await Bun.sleep(pollIntervalMs);
  }
}
function startMarkerPolling(config) {
  const state = createPollingState();
  const promise = pollMarkerFiles(config, state);
  return { promise, state };
}
function stopPolling(state) {
  state.active = false;
}
export {
  stopPolling,
  startMarkerPolling,
  pollMarkerFiles,
  createPollingState,
  cleanupSynthesisFiles,
  cleanupSessionFiles,
  cleanupCompletionMarkers
};
