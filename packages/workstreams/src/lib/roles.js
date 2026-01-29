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
function getRoleDenialMessage(command) {
  const role = getCurrentRole();
  const permission = COMMAND_PERMISSIONS[command];
  if (role === "AGENT") {
    const agentMessage = permission?.denialMessage || `This command requires human approval. Ask the user to run \`work ${command}\``;
    return `Access denied: ${agentMessage}`;
  }
  const baseMessage = permission?.denialMessage || `This command is not available`;
  return `Access denied: ${baseMessage}`;
}
function getCommandsForRole(role) {
  return Object.entries(COMMAND_PERMISSIONS).filter(([_, permission]) => permission.allowedRoles.includes(role)).map(([command]) => command).sort();
}
function getAllCommands() {
  return Object.keys(COMMAND_PERMISSIONS).sort();
}
export {
  getRoleDenialMessage,
  getCurrentRole,
  getCommandsForRole,
  getAllCommands,
  canExecuteCommand,
  COMMAND_PERMISSIONS
};
