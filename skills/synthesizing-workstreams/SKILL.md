---
name: synthesizing-workstreams
description: How to synthesize workstream session results. Guides execution of working agents and summary generation.
---

# Synthesizing Workstream Sessions

## Purpose

This skill guides synthesis agents through the process of orchestrating a working agent to perform a task, and then synthesizing the results into a concise, tracking-friendly summary.

## Execution Workflow

As a synthesis agent, you are the "manager" of the session. Your job is to run the worker, wait for it to finish, and report back.

### 1. Execute the Working Agent

You will be provided with a specific command to run the working agent. This command is pre-configured with the correct model, prompt, and session tracking.

**Action:**
Run the provided command exactly as is using the `bash` tool.

```bash
# Example (the actual command will be provided in your prompt)
cat "/tmp/workstream-prompt.txt" | opencode run --port 4096 --model "claude-3-5-sonnet" --title "Working Agent"
```

**Wait:**
The command will run the working agent in the foreground. It may take several minutes. Do not interrupt it unless it hangs for an unreasonable amount of time (e.g., > 10 minutes with no output).

### 2. Capture the Session ID

After the working agent finishes (success or failure), you must capture its session ID so the user can resume it later if needed.

**Action:**
Run the provided command to find and save the session ID.

```bash
# Example command to capture session ID
WORK_SESSION=$(opencode session list ... | jq ...)
echo "$WORK_SESSION" > "/tmp/workstream-session.txt"
```

### 3. Analyze the Session

Review the output of the working agent. Look for:
- **Completed Tasks**: Did it mark tasks as `completed`?
- **File Changes**: What files were modified?
- **Errors**: Did it encounter syntax errors, test failures, or tool errors?
- **Blockers**: Did it mark any task as `blocked`?

### 4. Generate the Synthesis Summary

Your final output must be a structured summary block. This summary is parsed by the workstream system to update the thread status and notify the user.

**Format:**
```
SYNTHESIS_SUMMARY_START
[Your 2-3 sentence summary]
SYNTHESIS_SUMMARY_END
```

**Content Guidelines:**
- **Outcomes over Activities**: specific what *changed* or *worked*, not just "I tried to...".
- **Specifics**: Name the files, functions, or tests involved.
- **Status**: Clearly state if the task was fully completed, partially completed, or failed.
- **Brevity**: Keep it under 50 words if possible.

## Example Scenarios

### Scenario A: Success
The working agent implemented a new feature and tests passed.

```
SYNTHESIS_SUMMARY_START
Implemented the `getSynthesisAgent` function in `agents-yaml.ts` and added corresponding unit tests. Validated the changes by running the `test:unit` script, which passed successfully. All tasks in the thread are complete.
SYNTHESIS_SUMMARY_END
```

### Scenario B: Partial Success / Blocker
The working agent wrote code but tests failed.

```
SYNTHESIS_SUMMARY_START
Created the `ProfileCard` component in `src/components/Profile.tsx` but encountered type errors during the build. The `User` interface is missing the `avatarUrl` property. Task marked as blocked pending schema update.
SYNTHESIS_SUMMARY_END
```

### Scenario C: Tool Error
The working agent failed to run a command.

```
SYNTHESIS_SUMMARY_START
Attempted to run the database migration but failed due to a "Connection Refused" error from the `bash` tool. No code changes were made. Please verify the database container is running.
SYNTHESIS_SUMMARY_END
```

## Troubleshooting

- **Working Agent Hangs**: If the working agent process seems stuck, you may need to kill it (using `ctrl+c` or `kill`) and report the timeout in your summary.
- **No Session ID**: If you cannot find the session ID, note this in the summary ("Session ID could not be captured") but still provide the summary of what happened.
- **Empty Output**: If the working agent produced no output, report "Working agent produced no output" and suggest checking the logs.

