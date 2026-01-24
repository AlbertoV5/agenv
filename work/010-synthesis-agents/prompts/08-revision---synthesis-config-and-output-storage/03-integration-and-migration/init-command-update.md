Hello Agent!

You are working on the "Integration and Migration" batch at the "Revision - Synthesis Config and Output Storage" stage of the "Synthesis Agents" workstream.

This is your thread:

"Init Command Update" (2)

## Thread Summary
Update `work init` to create synthesis.json with defaults.

## Thread Details
- Working packages: `./packages/workstreams`
- Update `packages/workstreams/src/cli/init.ts`:
- Add `synthesis.json` creation with default config:
  ```json
  {
    "enabled": false,
    "output": {
      "store_in_threads": true
    }
  }
  ```
- Add to the list of files created during init
- Update `work notifications` command:
- Remove synthesis status display (it's no longer in notifications.json)
- Add new `work synthesis` command (optional, low priority):
- Show current synthesis config
- Show whether synthesis is enabled

Your tasks are:
- [ ] 08.03.02.01 Update `work init` to create `synthesis.json` with default config `{ "enabled": false, "output": { "store_in_threads": true } }`
- [ ] 08.03.02.02 Add synthesis.json to the list of files created message
- [ ] 08.03.02.03 Update `work notifications` to remove synthesis status display (moved to synthesis.json)
- [ ] 08.03.02.04 Optional: Add `work synthesis` command to show current synthesis config and status

When listing tasks, use `work list --tasks --batch "08.03"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
