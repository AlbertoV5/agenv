# Opencode Commands

The Opencode agent environment includes a set of slash commands (prefixed with `w:`) that map directly to the `work` CLI tool. These commands allow you to manage workstreams directly from the chat interface without switching context.

## Command Prefix `w:`

All workstream commands use the `w:` prefix. For example, to check the status, you use `/w:status` (or just `w:status` depending on your client). This distinguishes them from other agent commands.

## Command Reference

| Command | Description | Equivalent CLI |
|---------|-------------|----------------|
| `w:agents` | Manage or list agents | `work agents` |
| `w:approve-plan` | Approve a plan | `work approve plan` |
| `w:approve-revision` | Approve a plan revision | `work approve revision` |
| `w:approve-tasks` | Approve specific tasks | `work approve tasks` |
| `w:complete` | Complete a plan or thread | `work complete` |
| `w:context` | Show current execution context | `work context` |
| `w:current` | Show or set current workstream | `work current` |
| `w:list` | List tasks | `work list` |
| `w:preview` | Preview plan structure | `work preview` |
| `w:prompt` | Generate or manage prompts | `work prompt` |
| `w:read` | Read task details | `work read` |
| `w:start` | Start a task | `work start` |
| `w:status` | Show status and progress | `work status` |
| `w:tree` | Show workstream tree structure | `work tree` |
| `w:update` | Update task status | `work update` |

## Usage Examples

### 1. Starting a New Task

Check the current status and start working on a task:

```bash
/w:status
/w:list --pending
/w:start --task "01.01.01.01"
```

### 2. Updating Progress

Update a task as you make progress or finish it:

```bash
/w:update --task "01.01.01.01" --status in_progress
/w:update --task "01.01.01.01" --status completed --report "Implemented feature X"
```

### 3. Reviewing Context

Get the full context of where you are in the workstream:

```bash
/w:current
/w:tree --batch "01.01"
/w:read --task "01.01.01.01"
```

### 4. Approvals

When a plan or revision needs approval:

```bash
/w:approve-plan
/w:approve-revision
```
