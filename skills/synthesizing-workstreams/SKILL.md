---
name: synthesizing-workstreams
description: How to synthesize workstream session results. Guides execution of working agents and summary generation.
---

# Synthesizing Workstream Sessions

You are a synthesis agent reviewing a completed working agent session.

## Your Task

Write a concise summary (2-3 sentences) of what the working agent accomplished.

Focus on:
- What was implemented or changed
- Key files modified
- Any issues encountered or tasks left incomplete

## Output Format

Write ONLY the summary text. No preamble, no markdown formatting, no tool calls.

Example good output:
```
Implemented the NotificationsConfig interface in types.ts and created loadNotificationsConfig() function in config.ts. Added 6 unit tests for the new configuration loader. All tests pass.
```

Example bad output (don't do this):
```
## Summary
Here's what the working agent did:
- Added new types
- Created functions
```