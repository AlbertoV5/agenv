// src/lib/roles.ts
var COMMAND_PERMISSIONS = {
  approve: {
    allowedRoles: ["USER"],
    denialMessage: "Approval requires human oversight. Ask the user to run `work approve <target>`"
  },
  start: {
    allowedRoles: ["USER"],
    denialMessage: "Starting a workstream requires human approval. Ask the user to run `work start`"
  },
  complete: {
    allowedRoles: ["USER"],
    denialMessage: "Completing a workstream requires human approval. Ask the user to run `work complete`"
  },
  status: { allowedRoles: ["USER", "AGENT"] },
  list: { allowedRoles: ["USER", "AGENT"] },
  tree: { allowedRoles: ["USER", "AGENT"] },
  update: { allowedRoles: ["USER", "AGENT"] },
  review: { allowedRoles: ["USER", "AGENT"] },
  current: { allowedRoles: ["USER", "AGENT"] },
  init: { allowedRoles: ["USER", "AGENT"] },
  fix: { allowedRoles: ["USER", "AGENT"] },
  generate: { allowedRoles: ["USER", "AGENT"] },
  delete: { allowedRoles: ["USER", "AGENT"] },
  plan: { allowedRoles: ["USER", "AGENT"] },
  agents: { allowedRoles: ["USER", "AGENT"] },
  prompts: { allowedRoles: ["USER", "AGENT"] }
};
function getCurrentRole() {
  const envRole = process.env.WORKSTREAM_ROLE?.toUpperCase();
  if (envRole === "USER")
    return "USER";
  return "AGENT";
}
function canExecuteCommand(command) {
  const permission = COMMAND_PERMISSIONS[command];
  if (!permission)
    return true;
  return permission.allowedRoles.includes(getCurrentRole());
}

// src/lib/help.ts
function getRoleHelpNote(command) {
  const permission = COMMAND_PERMISSIONS[command];
  if (permission?.allowedRoles.length === 1 && permission.allowedRoles[0] === "USER") {
    return "Note: This command requires USER role (human-in-the-loop)";
  }
  return null;
}
function filterCommandsForRole(commands) {
  return commands.filter((cmd) => canExecuteCommand(cmd));
}
function getRoleFooter() {
  const role = getCurrentRole();
  return `Current role: ${role}`;
}
function isUserOnlyCommand(command) {
  const permission = COMMAND_PERMISSIONS[command];
  return permission?.allowedRoles.length === 1 && permission.allowedRoles[0] === "USER";
}
export {
  isUserOnlyCommand,
  getRoleHelpNote,
  getRoleFooter,
  filterCommandsForRole
};
