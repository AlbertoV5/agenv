/**
 * Role-aware help utilities for the CLI
 */

import {
  COMMAND_PERMISSIONS,
  getCurrentRole,
  canExecuteCommand,
} from "./roles.ts"

/**
 * Get a help note for a command if it has role restrictions
 * @param command The command name to check
 * @returns A note string if the command is USER-only, null otherwise
 */
export function getRoleHelpNote(command: string): string | null {
  const permission = COMMAND_PERMISSIONS[command]
  if (
    permission?.allowedRoles.length === 1 &&
    permission.allowedRoles[0] === "USER"
  ) {
    return "Note: This command requires USER role (human-in-the-loop)"
  }
  return null
}

/**
 * Filter a list of commands to only those available for the current role
 * @param commands Array of command names to filter
 * @returns Filtered array containing only commands the current role can execute
 */
export function filterCommandsForRole(commands: string[]): string[] {
  return commands.filter((cmd) => canExecuteCommand(cmd))
}

/**
 * Get the role footer text for help output
 * @returns Formatted string showing current role
 */
export function getRoleFooter(): string {
  const role = getCurrentRole()
  return `Current role: ${role}`
}

/**
 * Check if a command is restricted (USER-only)
 * @param command The command name to check
 * @returns true if the command is USER-only
 */
export function isUserOnlyCommand(command: string): boolean {
  const permission = COMMAND_PERMISSIONS[command]
  return (
    permission?.allowedRoles.length === 1 &&
    permission.allowedRoles[0] === "USER"
  )
}
