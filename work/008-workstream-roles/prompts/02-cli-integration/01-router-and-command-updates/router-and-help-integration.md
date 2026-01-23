Hello Agent!

You are working on the "Router and Command Updates" batch at the "CLI Integration" stage of the "Workstream Roles" workstream.

This is your thread:

"Router and Help Integration" (1)

## Thread Summary
Modify the main CLI router to check permissions and generate role-aware help.

## Thread Details
- Working package: `./packages/workstreams`
- Create `src/lib/help.ts` with:
```typescript
export function getRoleHelpNote(command: string): string | null {
  const permission = COMMAND_PERMISSIONS[command]
  if (permission?.allowedRoles.length === 1 && permission.allowedRoles[0] === "USER") {
    return "Note: This command requires USER role (human-in-the-loop)"
  }
  return null
}

export function filterCommandsForRole(commands: string[]): string[] {
  const role = getCurrentRole()
  return commands.filter(cmd => canExecuteCommand(cmd))
}
```
- Update `bin/work.ts`:
- Import role utilities and help utilities
- Before dispatching to subcommand, check `canExecuteCommand(subcommand)`
- If denied, print `getRoleDenialMessage(subcommand)` and exit with code 1
- Update main help to use `filterCommandsForRole()`
- Add footer to help showing current role
- Add `--show-all-commands` flag

Your tasks are:
- [ ] 02.01.01.01 Create `packages/workstreams/src/lib/help.ts` with `getRoleHelpNote(command)` and `filterCommandsForRole(commands)` utilities
- [ ] 02.01.01.02 Update `packages/workstreams/bin/work.ts` to import role and help utilities
- [ ] 02.01.01.03 Add permission check before subcommand dispatch - call `canExecuteCommand()` and exit with denial message if rejected
- [ ] 02.01.01.04 Update main help output to filter commands using `filterCommandsForRole()` based on current role
- [ ] 02.01.01.05 Add footer to help output showing current role (e.g., "Current role: AGENT")
- [ ] 02.01.01.06 Add `--show-all-commands` flag to display all commands regardless of role restrictions

When listing tasks, use `work list --tasks --batch "02.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
