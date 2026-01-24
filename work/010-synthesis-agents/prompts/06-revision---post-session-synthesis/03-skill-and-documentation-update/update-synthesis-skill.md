Hello Agent!

You are working on the "Skill and Documentation Update" batch at the "Revision - Post-Session Synthesis" stage of the "Synthesis Agents" workstream.

This is your thread:

"Update Synthesis Skill" (1)

## Thread Summary
Rewrite the synthesizing-workstreams skill for post-session context.

## Thread Details
- Update `~/.config/opencode/skills/synthesizing-workstreams/SKILL.md`:
- Remove instructions about running working agent (it already ran)
- Focus on: "You are given the text output from a completed working agent session"
- Instruct to summarize what was accomplished
- Keep summary format guidelines (2-3 sentences, focus on changes made)
- Note that context is piped via stdin
- Example new skill content:
```markdown
# Synthesizing Workstreams

You are a synthesis agent reviewing a completed working agent session.

## Context
The text below contains the assistant's responses from a workstream thread.
The working agent has already completed its tasks.

## Your Task
Write a concise summary (2-3 sentences) of what the working agent accomplished.
Focus on:
- What was implemented or changed
- Key files modified
- Any issues encountered

## Output
Write ONLY the summary, nothing else.
```

Your tasks are:
- [ ] 06.03.01.01 Rewrite `~/.config/opencode/skills/synthesizing-workstreams/SKILL.md` for post-session context (not wrapper)
- [ ] 06.03.01.02 Remove instructions about running working agent - it already ran, context is piped via stdin
- [ ] 06.03.01.03 Add clear guidance: "You are given the text output from a completed working agent session"
- [ ] 06.03.01.04 Keep summary format guidelines (2-3 sentences, focus on what was implemented/changed)
- [ ] 06.03.01.05 Add instruction to write ONLY the summary, nothing else (no preamble, no tool calls)

When listing tasks, use `work list --tasks --batch "06.03"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
