// src/lib/interactive.ts
import * as readline from "readline";
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}
async function selectFromList(rl, prompt, items, displayFn) {
  console.log(`
${prompt}`);
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${displayFn(item, i)}`);
  });
  return new Promise((resolve, reject) => {
    rl.question(`
Enter number or name: `, (answer) => {
      const trimmed = answer.trim();
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= items.length) {
        resolve({ index: num - 1, value: items[num - 1] });
        return;
      }
      const lowerAnswer = trimmed.toLowerCase();
      const matchIndex = items.findIndex((item) => displayFn(item, 0).toLowerCase().includes(lowerAnswer));
      if (matchIndex >= 0) {
        resolve({ index: matchIndex, value: items[matchIndex] });
        return;
      }
      reject(new Error(`Invalid selection: "${trimmed}"`));
    });
  });
}
async function promptText(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}
async function selectStage(rl, stages) {
  return selectFromList(rl, "Select stage:", stages, (stage) => `Stage ${stage.id.toString().padStart(2, "0")}: ${stage.name || "(unnamed)"}`);
}
async function selectBatch(rl, batches) {
  return selectFromList(rl, "Select batch:", batches, (batch) => `Batch ${batch.prefix}: ${batch.name || "(unnamed)"}`);
}
async function selectThread(rl, threads) {
  return selectFromList(rl, "Select thread:", threads, (thread) => `Thread ${thread.id}: ${thread.name || "(unnamed)"}`);
}
function calculateThreadStatus(tasks) {
  if (tasks.length === 0)
    return "incomplete";
  const allCompleted = tasks.every((t) => t.status === "completed" || t.status === "cancelled");
  if (allCompleted)
    return "completed";
  const hasFailed = tasks.some((t) => t.sessions && t.sessions.length > 0 && t.sessions[t.sessions.length - 1]?.status === "failed");
  if (hasFailed)
    return "failed";
  return "incomplete";
}
function getLastAgent(tasks) {
  for (let i = tasks.length - 1;i >= 0; i--) {
    const task = tasks[i];
    if (task?.sessions && task.sessions.length > 0) {
      const lastSession = task.sessions[task.sessions.length - 1];
      if (lastSession?.agentName) {
        return lastSession.agentName;
      }
    }
  }
  return;
}
function getSessionCount(tasks) {
  return tasks.reduce((sum, task) => {
    return sum + (task.sessions?.length || 0);
  }, 0);
}
function buildThreadStatuses(allTasks, threadIds) {
  return threadIds.map((threadId) => {
    const threadTasks = allTasks.filter((t) => t.id.startsWith(threadId + "."));
    const firstTask = threadTasks[0];
    return {
      threadId,
      threadName: firstTask?.thread_name || "(unknown)",
      status: calculateThreadStatus(threadTasks),
      sessionsCount: getSessionCount(threadTasks),
      lastAgent: getLastAgent(threadTasks)
    };
  });
}
function displayThreadStatusTable(statuses) {
  console.log(`
Thread Status:`);
  console.log("─".repeat(80));
  console.log(`${"Thread".padEnd(12)} ${"Status".padEnd(12)} ${"Sessions".padEnd(10)} ${"Last Agent".padEnd(20)}`);
  console.log("─".repeat(80));
  for (const status of statuses) {
    const statusDisplay = status.status.padEnd(12);
    const sessionsDisplay = status.sessionsCount.toString().padEnd(10);
    const agentDisplay = (status.lastAgent || "-").padEnd(20);
    console.log(`${status.threadId.padEnd(12)} ${statusDisplay} ${sessionsDisplay} ${agentDisplay}`);
  }
  console.log("─".repeat(80));
  console.log();
}
async function selectThreadFromStatuses(rl, statuses) {
  displayThreadStatusTable(statuses);
  return selectFromList(rl, "Select a thread to fix:", statuses, (status) => `${status.threadId} - ${status.threadName} (${status.status})`);
}
async function selectFixAction(rl, threadStatus) {
  const actions = [];
  if (threadStatus.status === "incomplete" && threadStatus.sessionsCount > 0) {
    actions.push({
      action: "resume",
      label: "Resume",
      description: "Continue the existing session"
    });
  }
  if (threadStatus.status === "failed" || threadStatus.status === "incomplete") {
    actions.push({
      action: "retry",
      label: "Retry",
      description: "Start a new session with the same agent"
    });
  }
  if (threadStatus.status !== "completed") {
    actions.push({
      action: "change-agent",
      label: "Change Agent",
      description: "Retry with a different agent"
    });
  }
  actions.push({
    action: "new-stage",
    label: "New Stage",
    description: "Create a new fix stage"
  });
  console.log(`
Available actions:`);
  actions.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.label} - ${a.description}`);
  });
  const result = await selectFromList(rl, `
Select action:`, actions, (a) => a.label);
  return result.value.action;
}
async function selectAgent(rl, agents) {
  console.log(`
Available agents:`);
  agents.forEach((agent, i) => {
    console.log(`  ${i + 1}. ${agent.name}`);
    console.log(`     ${agent.description}`);
    console.log(`     Best for: ${agent.bestFor}`);
    console.log();
  });
  return selectFromList(rl, "Select an agent:", agents, (agent) => agent.name);
}
async function confirmAction(rl, message) {
  const answer = await promptText(rl, `${message} (y/n): `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}
export {
  selectThreadFromStatuses,
  selectThread,
  selectStage,
  selectFromList,
  selectFixAction,
  selectBatch,
  selectAgent,
  promptText,
  getSessionCount,
  getLastAgent,
  displayThreadStatusTable,
  createReadlineInterface,
  confirmAction,
  calculateThreadStatus,
  buildThreadStatuses
};
