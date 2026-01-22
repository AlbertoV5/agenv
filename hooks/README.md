# AgEnv Hooks

Hooks for Claude Code that trigger on specific events.

## Structure

Each hook is defined as a JSON file in this directory. The `hooks.json` file merges all hooks together for installation.

## Installation

```bash
ag install hooks --claude
```

## Available Hooks

### SessionStart Hooks
- Triggered when a Claude Code session starts

### PreToolUse / PostToolUse Hooks  
- Triggered before/after tool execution (coming soon)

## Creating New Hooks

1. Create a new JSON file in this directory
2. Follow the Claude Code hooks schema
3. Run `ag install hooks` to deploy
