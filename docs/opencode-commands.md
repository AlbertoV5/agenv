# Opencode Commands

The Opencode agent environment uses a special "bang" syntax to execute `work` CLI commands directly from the chat interface. This allows you to manage workstreams without switching context between the agent and your terminal.

## Bang Syntax: `!work`

To run any `work` CLI command from the chat interface, prefix it with `!`:

```
!work status
!work list --tasks
!work update --task "01.01.01.01" --status completed
```

The `!` prefix tells the agent to execute the following command as a bash command in your environment.

## Agent vs User Commands

There are two types of command execution:

### User Commands (Bang Syntax)
When **you** (the user) want to execute a `work` command, use the `!` prefix:

```
!work status
!work approve plan
!work start
!work complete
```

### Agent Commands (Direct)
When the **agent** executes `work` commands (as part of its task implementation), it runs them directly without the `!` prefix. This happens automatically when the agent is working on tasks.

## Common Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `!work status` | Show workstream status and progress | `!work status` |
| `!work list` | List tasks with optional filters | `!work list --tasks --batch "01.01"` |
| `!work tree` | Show workstream tree structure | `!work tree --batch "01.01"` |
| `!work approve plan` | Approve a workstream plan | `!work approve plan` |
| `!work approve tasks` | Approve tasks and generate tasks.json | `!work approve tasks` |
| `!work approve revision` | Approve a plan revision | `!work approve revision` |
| `!work start` | Start working on a workstream | `!work start` |
| `!work complete` | Mark a workstream as complete (requires valid REPORT.md) | `!work complete` |
| `!work update` | Update task status | `!work update --task "01.01.01.01" --status completed` |
| `!work report init` | Initialize REPORT.md template | `!work report init` |
| `!work report validate` | Validate REPORT.md content | `!work report validate` |
| `!work current` | Show or set current workstream | `!work current` |
| `!work context` | Show current execution context | `!work context` |

## Usage Examples

### 1. Starting a New Workstream

Check the status and start working:

```
!work status
!work list --pending
!work start
```

### 2. Monitoring Progress

View progress and task details:

```
!work tree
!work list --tasks --batch "01.01"
!work status
```

### 3. Approving Plans

When a plan is ready for approval:

```
!work review plan
!work approve plan
```

### 4. Completing Work

When you finish a workstream, ensure REPORT.md exists and is valid:

```
!work report init        # Initialize REPORT.md if needed
!work report validate    # Validate required sections
!work status
!work complete           # Requires valid REPORT.md
```
