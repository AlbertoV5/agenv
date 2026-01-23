Hello Agent!

You are working on the "Role System Foundation" batch at the "Core Role Infrastructure" stage of the "Workstream Roles" workstream.

This is your thread:

"Core Role System" (1)

## Thread Summary
Create the role type definitions, command permissions registry, and enforcement utilities.

## Thread Details
- Working package: `./packages/workstreams`
- Create `src/lib/roles.ts` with:
```typescript
export type WorkstreamRole = "USER" | "AGENT"

export interface CommandPermission {
  allowedRoles: WorkstreamRole[]
  denialMessage?: string  // Custom message for this command
}

export const COMMAND_PERMISSIONS: Record<string, CommandPermission> = {
  // USER-only commands (approval gates)
  "approve": { allowedRoles: ["USER"], denialMessage: "Approval commands require USER role to maintain human-in-the-loop control" },
  "start": { allowedRoles: ["USER"], denialMessage: "Starting workstreams requires USER role" },
  "complete": { allowedRoles: ["USER"], denialMessage: "Completing workstreams requires USER role" },
  
  // All other commands default to both roles
  // ... populate with all commands
}

export function getCurrentRole(): WorkstreamRole {
  const envRole = process.env.WORKSTREAM_ROLE?.toUpperCase()
  if (envRole === "USER") return "USER"
  return "AGENT"  // Default to AGENT (primary CLI users)
}

export function canExecuteCommand(command: string): boolean {
  const permission = COMMAND_PERMISSIONS[command]
  if (!permission) return true  // Unknown commands allowed by default
  return permission.allowedRoles.includes(getCurrentRole())
}

export function getRoleDenialMessage(command: string): string {
  const role = getCurrentRole()
  const permission = COMMAND_PERMISSIONS[command]
  const baseMessage = permission?.denialMessage || `This command is not available for ${role} role`
  return `Access denied: ${baseMessage}\n\nCurrent role: ${role}\nTo change role, set WORKSTREAM_ROLE environment variable.`
}
```
- Export types and functions for external use
- Write unit tests for role detection and permission checking

Your tasks are:
- [ ] 01.01.01.01 Create `packages/workstreams/src/lib/roles.ts` with `WorkstreamRole` type ("USER" | "AGENT") and `CommandPermission` interface
- [ ] 01.01.01.02 Define `COMMAND_PERMISSIONS` registry with USER-only commands (approve, start, complete) and custom denial messages
- [ ] 01.01.01.03 Implement `getCurrentRole()` function that reads `WORKSTREAM_ROLE` env var, defaulting to "AGENT"
- [ ] 01.01.01.04 Implement `canExecuteCommand(command)` function to check if current role can execute a command
- [ ] 01.01.01.05 Implement `getRoleDenialMessage(command)` function returning formatted access denied message
- [ ] 01.01.01.06 Add helper `getCommandsForRole(role)` to list all commands available for a given role
- [ ] 01.01.01.07 Export all types and functions from the module and add to `src/lib/index.ts` if applicable
- [ ] 01.01.01.08 Write unit tests in `packages/workstreams/tests/roles.test.ts` for all role functions

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
