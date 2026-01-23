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
 * Commands not listed here are allowed for all roles by default
 */
export const COMMAND_PERMISSIONS: Record<string, CommandPermission> = {
  // USER-only commands (approval gates)
  approve: {
    allowedRoles: ["USER"],
    denialMessage:
      "Approval commands require USER role to maintain human-in-the-loop control",
  },
  start: {
    allowedRoles: ["USER"],
    denialMessage: "Starting workstreams requires USER role",
  },
  complete: {
    allowedRoles: ["USER"],
    denialMessage: "Completing workstreams requires USER role",
  },

  // Commands available to both roles (explicit for documentation)
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
  prompts: { allowedRoles: ["USER", "AGENT"] },
}

/**
 * Get the current role from environment variable
 * @returns The current role, defaults to "AGENT" if not set or invalid
 */
export function getCurrentRole(): WorkstreamRole {
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
  const baseMessage =
    permission?.denialMessage || `This command is not available for ${role} role`
  return `Access denied: ${baseMessage}\n\nCurrent role: ${role}\nTo change role, set WORKSTREAM_ROLE environment variable.`
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
