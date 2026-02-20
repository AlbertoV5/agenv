/**
 * Role-based access control for workstream commands
 */

/**
 * Workstream roles that determine command access
 * - USER: Human operator with full privileges (approval gates)
 * - AGENT: AI agent with restricted access (no approval commands)
 */
export type WorkstreamRole = "USER" | "AGENT"

/**
 * Permission configuration for a command
 */
export interface CommandPermission {
  /** Roles that can execute this command */
  allowedRoles: WorkstreamRole[]
  /** Custom denial message for this specific command */
  denialMessage?: string
}

/**
 * Registry of command permissions
 * Commands not listed here are allowed for all roles by default.
 * 
 * DESIGN NOTE: 
 * The default permission is permissive (allow all) to ensure new commands 
 * work out-of-the-box for agents. We only explicitly restrict high-risk 
 * "approval gate" commands to USER role to enforce human-in-the-loop verification.
 */
export const COMMAND_PERMISSIONS: Record<string, CommandPermission> = {
  // USER-only commands (approval gates)
  // These commands control the lifecycle transition from planning -> execution
  approve: {
    allowedRoles: ["USER"],
    denialMessage:
      "Approval requires human oversight. Ask the user to run `work approve <target>`",
  },
  start: {
    allowedRoles: ["USER"],
    denialMessage: "Starting a workstream requires human approval. Ask the user to run `work start`",
  },
  complete: {
    allowedRoles: ["USER"],
    denialMessage: "Completing a workstream requires human approval. Ask the user to run `work complete`",
  },

  // Commands available to both roles (explicit for documentation)
  status: { allowedRoles: ["USER", "AGENT"] },
  list: { allowedRoles: ["USER", "AGENT"] },
  tree: { allowedRoles: ["USER", "AGENT"] },
  update: { allowedRoles: ["USER", "AGENT"] },
  review: { allowedRoles: ["USER", "AGENT"] },
  current: { allowedRoles: ["USER", "AGENT"] },
  init: { allowedRoles: ["USER", "AGENT"] },
  generate: { allowedRoles: ["USER", "AGENT"] },
  delete: { allowedRoles: ["USER", "AGENT"] },
  plan: { allowedRoles: ["USER", "AGENT"] },
  agents: { allowedRoles: ["USER", "AGENT"] },
  prompts: { allowedRoles: ["USER", "AGENT"] },
}

/**
 * Get the current role from environment variable
 * @returns The current role, defaults to "AGENT" if not set or invalid
 */
export function getCurrentRole(): WorkstreamRole {
  // We use process.env.WORKSTREAM_ROLE to override the role.
  // In a typical agent environment, this is unset or set to AGENT.
  // Humans should set this to USER in their shell profile.
  const envRole = process.env.WORKSTREAM_ROLE?.toUpperCase()
  if (envRole === "USER") return "USER"
  return "AGENT" // Default to AGENT (primary CLI users are AI agents)
}

/**
 * Check if the current role can execute a command
 * @param command The command name to check
 * @returns true if the current role can execute the command
 */
export function canExecuteCommand(command: string): boolean {
  const permission = COMMAND_PERMISSIONS[command]
  if (!permission) return true // Unknown commands allowed by default
  return permission.allowedRoles.includes(getCurrentRole())
}

/**
 * Get a formatted denial message for a command
 * @param command The command that was denied
 * @returns A formatted error message explaining the denial
 */
export function getRoleDenialMessage(command: string): string {
  const role = getCurrentRole()
  const permission = COMMAND_PERMISSIONS[command]
  
  if (role === "AGENT") {
    // Agent-friendly message: tell them what to ask the user to do
    const agentMessage =
      permission?.denialMessage ||
      `This command requires human approval. Ask the user to run \`work ${command}\``
    return `Access denied: ${agentMessage}`
  }
  
  // For USER role (shouldn't normally happen, but handle gracefully)
  const baseMessage =
    permission?.denialMessage || `This command is not available`
  return `Access denied: ${baseMessage}`
}

/**
 * Get all commands available for a given role
 * @param role The role to check
 * @returns Array of command names available to the role
 */
export function getCommandsForRole(role: WorkstreamRole): string[] {
  return Object.entries(COMMAND_PERMISSIONS)
    .filter(([_, permission]) => permission.allowedRoles.includes(role))
    .map(([command]) => command)
    .sort()
}

/**
 * Get all registered commands
 * @returns Array of all command names in the permissions registry
 */
export function getAllCommands(): string[] {
  return Object.keys(COMMAND_PERMISSIONS).sort()
}
