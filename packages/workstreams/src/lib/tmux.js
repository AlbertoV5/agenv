// src/lib/tmux.ts
import { execSync, spawn } from "child_process";
var THREAD_START_DELAY_MS = 3000;
function sleepWithCountdown(ms, label = "Waiting") {
  const seconds = Math.ceil(ms / 1000);
  for (let i = seconds;i > 0; i--) {
    process.stdout.write(`\r  ${label} ${i}s...`);
    Bun.sleepSync(1000);
  }
  process.stdout.write(`\r  ${label} done.   
`);
}
function sessionExists(name) {
  try {
    execSync(`tmux has-session -t "${name}" 2>/dev/null`, {
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}
function createSession(sessionName, windowName, command) {
  const result = Bun.spawnSync([
    "tmux",
    "new-session",
    "-d",
    "-s",
    sessionName,
    "-n",
    windowName,
    command
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create tmux session: ${result.stderr.toString()}`);
  }
}
function addWindow(sessionName, windowName, command) {
  const result = Bun.spawnSync([
    "tmux",
    "new-window",
    "-t",
    sessionName,
    "-n",
    windowName,
    command
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to add tmux window: ${result.stderr.toString()}`);
  }
}
function getPaneId(target) {
  try {
    const output = execSync(`tmux list-panes -t "${target}" -F "#{pane_id}"`, { stdio: "pipe", encoding: "utf-8" });
    return output.trim().split(`
`)[0] || "";
  } catch {
    return "";
  }
}
function splitWindow(target, command, size, direction = "h") {
  const args = [
    "split-window",
    "-t",
    target,
    direction === "h" ? "-h" : "-v"
  ];
  if (size) {
    args.push("-l", size.toString() + "%");
  } else {}
  args.push(command);
  const result = Bun.spawnSync(["tmux", ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to split window: ${result.stderr.toString()}`);
  }
}
function joinPane(src, dst, size, direction = "h") {
  const args = [
    "join-pane",
    "-s",
    src,
    "-t",
    dst,
    direction === "h" ? "-h" : "-v"
  ];
  if (size) {
    args.push("-l", size.toString() + "%");
  }
  const result = Bun.spawnSync(["tmux", ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to join pane: ${result.stderr.toString()}`);
  }
}
function breakPane(src) {
  const result = Bun.spawnSync([
    "tmux",
    "break-pane",
    "-s",
    src,
    "-d"
  ]);
}
function resizePane(target, size, direction = "x") {
  const result = Bun.spawnSync([
    "tmux",
    "resize-pane",
    "-t",
    target,
    direction === "x" ? "-x" : "-y",
    size.toString() + "%"
  ]);
}
function selectWindow(sessionName, windowIndex) {
  execSync(`tmux select-window -t "${sessionName}:${windowIndex}"`, {
    stdio: "pipe"
  });
}
function attachSession(sessionName) {
  const child = spawn("tmux", ["attach", "-t", sessionName], {
    stdio: "inherit"
  });
  return child;
}
function killSession(sessionName) {
  try {
    execSync(`tmux kill-session -t "${sessionName}"`, { stdio: "pipe" });
  } catch {}
}
function listWindows(sessionName) {
  try {
    const output = execSync(`tmux list-windows -t "${sessionName}" -F "#{window_name}"`, { stdio: "pipe", encoding: "utf-8" });
    return output.trim().split(`
`).filter(Boolean);
  } catch {
    return [];
  }
}
function getSessionInfo(sessionName) {
  try {
    const output = execSync(`tmux list-sessions -F "#{session_name}:#{session_windows}:#{session_attached}" 2>/dev/null`, { stdio: "pipe", encoding: "utf-8" });
    const lines = output.trim().split(`
`);
    for (const line of lines) {
      const [name, windows, attached] = line.split(":");
      if (name === sessionName) {
        return {
          name,
          windows: parseInt(windows || "0", 10),
          attached: attached === "1"
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
function getWorkSessionName(streamId) {
  const maxLen = 20;
  const truncated = streamId.length > maxLen ? streamId.slice(0, maxLen) : streamId;
  return `work-${truncated}`;
}
function buildCreateSessionCommand(sessionName, windowName, command) {
  return `tmux new-session -d -s "${sessionName}" -n "${windowName}" "${command}"`;
}
function buildAddWindowCommand(sessionName, windowName, command) {
  return `tmux new-window -t "${sessionName}" -n "${windowName}" "${command}"`;
}
function buildAttachCommand(sessionName) {
  return `tmux attach -t "${sessionName}"`;
}
function setGlobalOption(sessionName, option, value) {
  const result = Bun.spawnSync([
    "tmux",
    "set-option",
    "-t",
    sessionName,
    option,
    value
  ]);
  if (result.exitCode !== 0) {
    console.warn(`Warning: Failed to set tmux option ${option}: ${result.stderr.toString()}`);
  }
}
function createGridLayout(sessionWindow, commands) {
  if (commands.length === 0) {
    throw new Error("createGridLayout requires at least 1 command");
  }
  if (commands.length === 1) {
    const paneIds = listPaneIds(sessionWindow);
    return paneIds.length > 0 ? [paneIds[0]] : [];
  }
  if (commands.length === 2) {
    const splitResult = Bun.spawnSync([
      "tmux",
      "split-window",
      "-t",
      sessionWindow,
      "-h",
      commands[1]
    ]);
    if (splitResult.exitCode !== 0) {
      throw new Error(`Failed to create 2-pane layout: ${splitResult.stderr.toString()}`);
    }
    sleepWithCountdown(THREAD_START_DELAY_MS, "Stagger");
    return listPaneIds(sessionWindow);
  }
  Bun.spawnSync([
    "tmux",
    "split-window",
    "-t",
    `${sessionWindow}.0`,
    "-h",
    commands[1]
  ]);
  sleepWithCountdown(THREAD_START_DELAY_MS, "Stagger");
  const panesAfterHSplit = listPaneIds(sessionWindow);
  const rightPaneId = panesAfterHSplit[1];
  Bun.spawnSync([
    "tmux",
    "split-window",
    "-t",
    `${sessionWindow}.0`,
    "-v",
    commands[2]
  ]);
  sleepWithCountdown(THREAD_START_DELAY_MS, "Stagger");
  if (commands.length >= 4 && rightPaneId) {
    Bun.spawnSync([
      "tmux",
      "split-window",
      "-t",
      rightPaneId,
      "-v",
      commands[3]
    ]);
    sleepWithCountdown(THREAD_START_DELAY_MS, "Stagger");
  }
  return listPaneIds(sessionWindow);
}
function respawnPane(paneId, command) {
  Bun.spawnSync(["tmux", "respawn-pane", "-t", paneId, "-k", command]);
}
function listPaneIds(sessionWindow) {
  try {
    const output = execSync(`tmux list-panes -t "${sessionWindow}" -F "#{pane_id}"`, { stdio: "pipe", encoding: "utf-8" });
    return output.trim().split(`
`).filter(Boolean);
  } catch {
    return [];
  }
}
function sendKeys(target, keys) {
  Bun.spawnSync(["tmux", "send-keys", "-t", target, keys]);
}
function getPaneIndex(paneId) {
  try {
    const output = execSync(`tmux display-message -p -t "${paneId}" "#{pane_index}"`, { stdio: "pipe", encoding: "utf-8" });
    return parseInt(output.trim(), 10);
  } catch {
    return null;
  }
}
function selectPane(target) {
  Bun.spawnSync(["tmux", "select-pane", "-t", target]);
}
function getSessionPaneStatuses(sessionName) {
  try {
    const output = execSync(`tmux list-panes -s -t "${sessionName}" -F "#{window_index}|#{pane_index}|#{pane_id}|#{pane_pid}|#{pane_title}|#{pane_dead}|#{pane_dead_status}"`, { stdio: "pipe", encoding: "utf-8" });
    return output.trim().split(`
`).filter(Boolean).map((line) => {
      const [windowIndex, paneIndex, paneId, panePid, paneTitle, paneDead, exitStatus] = line.split("|");
      return {
        paneId: paneId || "",
        windowIndex: parseInt(windowIndex || "0", 10),
        paneIndex: parseInt(paneIndex || "0", 10),
        panePid: panePid ? parseInt(panePid, 10) : null,
        paneTitle: paneTitle || "",
        paneDead: paneDead === "1",
        exitStatus: exitStatus ? parseInt(exitStatus, 10) : null
      };
    });
  } catch {
    return [];
  }
}
function getPaneStatus(target) {
  try {
    const output = execSync(`tmux display-message -p -t "${target}" "#{window_index}|#{pane_index}|#{pane_id}|#{pane_pid}|#{pane_title}|#{pane_dead}|#{pane_dead_status}"`, { stdio: "pipe", encoding: "utf-8" });
    const [windowIndex, paneIndex, paneId, panePid, paneTitle, paneDead, exitStatus] = output.trim().split("|");
    if (!paneId) {
      return null;
    }
    return {
      paneId,
      windowIndex: parseInt(windowIndex || "0", 10),
      paneIndex: parseInt(paneIndex || "0", 10),
      panePid: panePid ? parseInt(panePid, 10) : null,
      paneTitle: paneTitle || "",
      paneDead: paneDead === "1",
      exitStatus: exitStatus ? parseInt(exitStatus, 10) : null
    };
  } catch {
    return null;
  }
}
function isPaneAlive(target) {
  const status = getPaneStatus(target);
  return status !== null && !status.paneDead;
}
function getPaneExitCode(target) {
  const status = getPaneStatus(target);
  if (!status || !status.paneDead)
    return null;
  return status.exitStatus;
}
function getExitedPanes(sessionName) {
  return getSessionPaneStatuses(sessionName).filter((p) => p.paneDead);
}
function getAlivePanes(sessionName) {
  return getSessionPaneStatuses(sessionName).filter((p) => !p.paneDead);
}
async function waitForAllPanesExit(sessionName, pollIntervalMs = 1000, timeoutMs = 0) {
  const startTime = Date.now();
  while (true) {
    const statuses = getSessionPaneStatuses(sessionName);
    if (statuses.length === 0) {
      return [];
    }
    const allDead = statuses.every((s) => s.paneDead);
    if (allDead) {
      return statuses;
    }
    if (timeoutMs > 0 && Date.now() - startTime >= timeoutMs) {
      return null;
    }
    await Bun.sleep(pollIntervalMs);
  }
}
function setPaneTitle(target, title) {
  Bun.spawnSync(["tmux", "select-pane", "-t", target, "-T", title]);
}
export {
  waitForAllPanesExit,
  splitWindow,
  sleepWithCountdown,
  setPaneTitle,
  setGlobalOption,
  sessionExists,
  sendKeys,
  selectWindow,
  selectPane,
  respawnPane,
  resizePane,
  listWindows,
  listPaneIds,
  killSession,
  joinPane,
  isPaneAlive,
  getWorkSessionName,
  getSessionPaneStatuses,
  getSessionInfo,
  getPaneStatus,
  getPaneIndex,
  getPaneId,
  getPaneExitCode,
  getExitedPanes,
  getAlivePanes,
  createSession,
  createGridLayout,
  buildCreateSessionCommand,
  buildAttachCommand,
  buildAddWindowCommand,
  breakPane,
  attachSession,
  addWindow,
  THREAD_START_DELAY_MS
};
