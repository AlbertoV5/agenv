Hello Agent!

You are working on the "Command and Flow Refactor" batch at the "Revision - Post-Session Synthesis" stage of the "Synthesis Agents" workstream.

This is your thread:

"Post-Synthesis Command Builder" (1)

## Thread Summary
Replace the wrapper-based synthesis command with a post-session approach.

## Thread Details
- Working packages: `./packages/workstreams`
- In `opencode.ts`:
- Keep `buildRetryRunCommand()` as the primary working agent command (unchanged)
- Add `buildPostSynthesisCommand(options)` that:
  1. Runs working agent normally (existing buildRetryRunCommand)
  2. After completion, exports the session: `opencode export $WORK_SESSION_ID`
  3. Extracts text messages using a helper script or inline jq
  4. Runs synthesis agent headless: `echo "$CONTEXT" | opencode run --format json --model X`
  5. Captures synthesis output
  6. Opens the WORKING agent session (not synthesis)
- Remove or deprecate `buildSynthesisRunCommand()` (wrapper approach)
- The shell script flow:
```bash
# 1. Run working agent (full TUI)
cat prompt.md | opencode run --model X --title "ThreadName__work_id=123"
WORK_EXIT=$?

# 2. Find working session ID
WORK_SESSION=$(opencode session list --max-count 5 --format json | jq -r '...')

# 3. Export session
opencode export "$WORK_SESSION" > /tmp/session.json

# 4. Extract text messages (jq or bun script)
CONTEXT=$(cat /tmp/session.json | jq -r '.messages[] | select(.info.role=="assistant") | .parts[] | select(.type=="text") | .text')

# 5. Run synthesis headless
echo "Summarize: $CONTEXT" | opencode run --format json --model Y > /tmp/synthesis.json

# 6. Extract synthesis output
SYNTHESIS=$(cat /tmp/synthesis.json | jq -r '...')
echo "$SYNTHESIS" > /tmp/synthesis-output.txt

# 7. Open working session for review
opencode --session "$WORK_SESSION"
```

Your tasks are:
- [ ] 06.02.01.01 Add `buildPostSynthesisCommand(options: PostSynthesisOptions)` function to opencode.ts that runs working agent first, then synthesis after
- [ ] 06.02.01.02 Implement shell script flow: run working agent with TUI → find session ID → export session → extract text via jq → run synthesis headless
- [ ] 06.02.01.03 Use `opencode run --format json` for synthesis agent to run headless (no TUI), capturing output to temp file
- [ ] 06.02.01.04 Modify session resume at end to open WORKING agent session (not synthesis) - use $WORK_SESSION_ID for `opencode --session`
- [ ] 06.02.01.05 Add jq command to extract text: `.messages[] | select(.info.role=="assistant") | .parts[] | select(.type=="text") | .text`
- [ ] 06.02.01.06 Deprecate `buildSynthesisRunCommand()` with JSDoc @deprecated tag pointing to new function

When listing tasks, use `work list --tasks --batch "06.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
