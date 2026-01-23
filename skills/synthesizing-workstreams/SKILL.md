---
name: synthesizing-workstreams
description: How to synthesize workstream session results. Guides execution of working agents and summary generation.
---

# Synthesizing Workstream Sessions

## Purpose

This skill guides synthesis agents through executing a working agent and generating a concise summary of the session results. The summary is used for tracking progress and understanding what was accomplished.

## Execution Workflow

### 1. Execute the Working Agent

You will receive an opencode command to execute. Run it exactly as provided:

```bash
# Example command structure (actual command will be provided to you)
opencode run "" --model
```

**Important:**
- Execute the command as-is without modification
- Wait for the agent session to complete
- The session may take several minutes depending on task complexity

### 2. Review the Session Output

After the agent completes, carefully review:
- **Task status updates**: Which tasks were marked as completed, in_progress, or blocked
- **Files changed**: What files were created, modified, or deleted
- **Key decisions**: Any important technical decisions or approaches taken
- **Issues encountered**: Errors, blockers, or challenges faced
- **Overall outcome**: Did the agent complete its assigned work successfully?

### 3. Generate the Synthesis Summary

Create a concise 2-3 sentence summary that captures:
- **What was done**: The primary work accomplished (specific files, features, fixes)
- **Key changes**: Important technical changes or additions
- **Issues or blockers**: Any problems encountered or tasks left incomplete

**Summary Guidelines:**
- Be specific: Mention file names, function names, or feature names
- Be concise: Maximum 3 sentences
- Focus on outcomes: What changed in the codebase, not just what the agent tried to do
- Note incomplete work: If tasks remain, state what's pending
- Use clear technical language: Avoid vague terms like "worked on" or "dealt with"

### 4. Output the Summary

Output your summary in this exact format for programmatic parsing:

```
SYNTHESIS_SUMMARY_START
[Your 2-3 sentence summary here]
SYNTHESIS_SUMMARY_END
```

**Example Output:**

```
SYNTHESIS_SUMMARY_START
Extended the YAML parser in agents-yaml.ts to parse synthesis_agents array and added getSynthesisAgent() and getDefaultSynthesisAgent() helper functions. Applied model validation logic to synthesis agents matching the validation used for regular agents. All four tasks in thread 01.02.01 were completed successfully with passing tests.
SYNTHESIS_SUMMARY_END
```

**Another Example with Issues:**

```
SYNTHESIS_SUMMARY_START
Created the HTTP server infrastructure in packages/workstreams/src/server.ts using Hono framework and added route handlers for /status and /health endpoints. Implemented basic error handling middleware but encountered TypeScript errors in the request validation logic. Task 01.03.02.03 remains blocked pending resolution of type inference issues with Hono's context object.
SYNTHESIS_SUMMARY_END
```

## Best Practices

- **Wait for completion**: Ensure the agent session finishes before reviewing
- **Read all output**: Don't skip error messages or warnings
- **Be accurate**: Only claim tasks as completed if explicitly marked so
- **Include context**: Mention the thread or batch ID if relevant for clarity
- **Flag problems**: If the agent failed or left work incomplete, clearly state this

## Common Scenarios

### Successful Completion
When all tasks are completed:
- List the main files/features changed
- Confirm all tasks in the thread are done
- Note any tests that passed

### Partial Completion
When some tasks remain:
- Summarize what was completed
- Clearly state what's pending
- Mention why work stopped (blocker, error, dependency)

### Failure or Error
When the agent encountered critical errors:
- Describe what the agent attempted
- Specify the error or blocker
- State which tasks could not be completed
