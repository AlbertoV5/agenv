// src/lib/cli-utils.ts
var COMMON_ARGS = {
  repoRoot: {
    long: "--repo-root",
    short: "-r",
    description: "Repository root (auto-detected if omitted)",
    takesValue: true,
    valueType: "string"
  },
  stream: {
    long: "--stream",
    short: "-s",
    aliases: ["--plan", "-p"],
    description: "Workstream ID or name (uses current if not specified)",
    takesValue: true,
    valueType: "string"
  },
  batch: {
    long: "--batch",
    short: "-b",
    description: 'Batch ID (format: "SS.BB", e.g., "01.02")',
    takesValue: true,
    valueType: "string"
  },
  thread: {
    long: "--thread",
    short: "-t",
    description: 'Thread ID (format: "SS.BB.TT", e.g., "01.01.02")',
    takesValue: true,
    valueType: "string"
  },
  task: {
    long: "--task",
    description: 'Task ID (format: "SS.BB.TT.NN", e.g., "01.01.02.03")',
    takesValue: true,
    valueType: "string"
  },
  agent: {
    long: "--agent",
    short: "-a",
    description: "Agent name to use",
    takesValue: true,
    valueType: "string"
  },
  port: {
    long: "--port",
    short: "-p",
    description: "OpenCode server port (default: 4096)",
    takesValue: true,
    valueType: "number",
    defaultValue: 4096
  },
  dryRun: {
    long: "--dry-run",
    description: "Show commands without executing",
    takesValue: false
  },
  json: {
    long: "--json",
    short: "-j",
    description: "Output as JSON",
    takesValue: false
  },
  silent: {
    long: "--silent",
    description: "Disable notification sounds",
    takesValue: false
  },
  help: {
    long: "--help",
    short: "-h",
    description: "Show this help message",
    takesValue: false
  }
};
function formatHelpSection(title, items, labelWidth = 20) {
  const lines = [`${title}:`];
  for (const item of items) {
    const padding = " ".repeat(Math.max(1, labelWidth - item.label.length));
    lines.push(`  ${item.label}${padding}${item.description}`);
  }
  return lines.join(`
`);
}
function formatArgsHelp(args, labelWidth = 22) {
  const items = args.map((arg) => {
    const flags = [arg.long];
    if (arg.short)
      flags.unshift(arg.short);
    if (arg.aliases)
      flags.push(...arg.aliases);
    let label = flags.join(", ");
    if (arg.takesValue) {
      const valueName = arg.long.replace(/^--/, "").toUpperCase().replace(/-/g, "_");
      label += ` <${valueName}>`;
    }
    let description = arg.description;
    if (arg.required)
      description = `(Required) ${description}`;
    return { label, description };
  });
  return formatHelpSection("Options", items, labelWidth);
}
function buildHelpMessage(options) {
  const sections = [
    `${options.command} - ${options.description}`,
    "",
    "Usage:",
    ...options.usage.map((u) => `  ${u}`),
    "",
    formatArgsHelp(options.args)
  ];
  if (options.examples && options.examples.length > 0) {
    sections.push("", "Examples:");
    for (const example of options.examples) {
      sections.push(`  ${example}`);
    }
  }
  if (options.notes && options.notes.length > 0) {
    sections.push("", ...options.notes);
  }
  return sections.join(`
`);
}
function parseBatchId(batchId) {
  const parts = batchId.split(".");
  if (parts.length !== 2)
    return null;
  const stage = parseInt(parts[0], 10);
  const batch = parseInt(parts[1], 10);
  if (isNaN(stage) || isNaN(batch))
    return null;
  if (stage < 1 || batch < 1)
    return null;
  return { stage, batch };
}
function parseThreadIdFormat(threadId) {
  const parts = threadId.split(".");
  if (parts.length !== 3)
    return null;
  const stage = parseInt(parts[0], 10);
  const batch = parseInt(parts[1], 10);
  const thread = parseInt(parts[2], 10);
  if (isNaN(stage) || isNaN(batch) || isNaN(thread))
    return null;
  if (stage < 1 || batch < 1 || thread < 1)
    return null;
  return { stage, batch, thread };
}
function isNumericId(id, expectedParts = 3) {
  const parts = id.split(".");
  if (parts.length !== expectedParts)
    return false;
  return parts.every((p) => /^\d+$/.test(p));
}
function formatNumericId(parts, padding = 2) {
  return parts.map((p) => p.toString().padStart(padding, "0")).join(".");
}
function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
}
export {
  safeFileName,
  parseThreadIdFormat,
  parseBatchId,
  isNumericId,
  formatNumericId,
  formatHelpSection,
  formatArgsHelp,
  buildHelpMessage,
  COMMON_ARGS
};
