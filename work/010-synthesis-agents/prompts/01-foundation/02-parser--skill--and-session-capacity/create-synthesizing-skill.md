Hello Agent!

You are working on the "Parser, Skill, and Session Capacity" batch at the "Foundation" stage of the "Synthesis Agents" workstream.

This is your thread:

"Create Synthesizing Skill" (2)

## Thread Summary
Create the synthesizing-workstreams skill file that synthesis agents will use.

## Thread Details
- Create file: `~/.config/opencode/skills/synthesizing-workstreams/SKILL.md`
- Skill instructs agent to:
1. Run the provided opencode command to execute the working agent
2. After completion, review the session output
3. Generate a concise summary (2-3 sentences) of what was accomplished
4. Output the summary in a specific format for parsing
- Include guidance on summary format: focus on what was done, key changes, any issues
- Test the skill loads correctly with opencode's skill loader

Your tasks are:
- [ ] 01.02.02.01 Create directory and file at `~/.config/opencode/skills/synthesizing-workstreams/SKILL.md`
- [ ] 01.02.02.02 Write skill instructions for running the provided opencode command to execute the working agent
- [ ] 01.02.02.03 Add guidance for reviewing session output and generating concise 2-3 sentence summaries focusing on what was done, key changes, and any issues
- [ ] 01.02.02.04 Define a specific output format for the synthesis summary that can be parsed programmatically
- [ ] 01.02.02.05 Test that the skill loads correctly with opencode's skill loader

When listing tasks, use `work list --tasks --batch "01.02"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
