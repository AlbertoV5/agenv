# AgEnv

A centralized Python+Bun environment for AI agents. This monorepo provides shared packages and libraries that can be used across different agent environments (Claude, Gemini, etc.).

## Structure

```
~/agenv/
├── agent/              # Opencode agent configuration (commands, skills, tools)
│   ├── skills/         # Shared agent skills
│   └── ...
├── packages/           # Bun/TypeScript packages
│   ├── cli/            # Main CLI (@agenv/cli)
│   └── workstreams/    # Workstream management library
├── docs/               # Documentation
├── libraries/          # Python libraries (uv workspace)
└── services/           # Long-running services
```

## Installation

### Option 1: From Source (Recommended for Development)

```bash
# Install CLI tools and add to PATH
~/agenv/install.sh

# Install CLI + skills to ~/.claude/skills
~/agenv/install.sh --with-skills

# Install skills to all agent directories (Claude, Gemini)
~/agenv/install.sh --skills-all

# Reload shell or run:
source ~/.zshrc  # or ~/.bashrc
```

This adds `~/agenv/bin` to your PATH and creates the `work` command.

### Option 2: Global Installation via npm/bun

Install the workstreams package globally to get the `work` command:

```bash
# Using npm
npm install -g @agenv/workstreams

# Using bun
bun install -g @agenv/workstreams
```

After installation, verify with:
```bash
work --help
```

**Note:** This option installs only the workstreams package. For the full agenv environment with skills, use Option 1.

## CLI

AgEnv provides the `work` command for workstream management:

```bash
# Show help
work --help

# Create a new workstream
work create --name my-feature

# Set current workstream (avoids --stream on every command)
work current --set "001-my-feature"
work current                          # Show current workstream
work current --clear                  # Clear current workstream

# Once current workstream is set, all commands use it by default:
work preview                          # Show PLAN.md structure
work validate                         # Validate PLAN.md structure
work add-task --stage 01 --Batch 01 --thread 01 --name "Task description"
work list --tasks                     # List tasks with status
work read --task "01.01.01.01"        # Read task details
work update --task "01.01.01.01" --status completed
work status                           # Show workstream progress
work complete                         # Mark workstream as complete (requires REPORT.md)
work serve                            # Launch web visualization

# Metrics and analysis
work metrics                          # Show workstream metrics
work metrics --blockers               # Show blocked tasks
work metrics --filter "api"           # Filter tasks by pattern

# Reports and exports
work report                           # Generate progress report
work changelog --since-days 7         # Changelog from completed tasks
work export --format csv              # Export to CSV

# Or specify a workstream explicitly:
work status --stream "001-my-feature"
```

### Task Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently working on |
| `completed` | Done |
| `blocked` | Cannot proceed (add note) |
| `cancelled` | Dropped (add reason) |

### Workstream Statuses

| Status | Meaning | Set by |
|--------|---------|--------|
| `pending` | No tasks started | Computed |
| `in_progress` | Has tasks in progress | Computed |
| `completed` | All tasks completed | Computed |
| `on_hold` | Paused, won't work on for now | Manual |

```bash
# Put workstream on hold
work set-status on_hold

# Clear manual status (use computed)
work set-status --clear
```

### Skills Installation

```bash
ag install skills --list              # List available skills
ag install skills --claude            # Install to ~/.claude/skills (default)
ag install skills --gemini            # Install to ~/.gemini/skills
ag install skills --all               # Install to all agent directories
ag install skills --target ~/custom   # Install to custom location
ag install skills --clean --claude    # Clean install
ag install skills --dry-run --all     # Preview what would be installed
```

## Packages

### @agenv/cli

The main CLI package that provides the `work` command for workstream management (delegates to @agenv/workstreams).

### @agenv/workstreams

Workstream management library for AI agents - create, track, and complete implementation plans.

**Plan Structure:**

Each plan consists of:
- `PLAN.md` - Structured markdown document defining stages, threads, and documentation
- `tasks.json` - JSON file tracking task status (separate from PLAN.md)
- `reference/` - Directory for supplementary documentation

**Task ID Format:** `{stage}.{batch}.{thread}.{task}` (e.g., `01.01.02.03` = Stage 01, Batch 01, Thread 02, Task 03)

**Library Usage:**

```typescript
import {
  getRepoRoot,
  generateStream,
  getStreamProgress,
  updateTask,
  completeStream,
  deleteStream,
  modifyIndex,
  addTasks,
  getTasks,
  consolidateStream
} from "@agenv/workstreams"

// Auto-detect repo root
const repoRoot = getRepoRoot()

// Create a workstream (generates PLAN.md template and empty tasks.json)
const result = generateStream({
  name: "my-feature",
  repoRoot
})

// Add tasks to a workstream
addTasks(repoRoot, "001-my-feature", [
  {
    id: "01.01.01.01",
    name: "Implement feature",
    thread_name: "Thread 01",
    batch_name: "Batch 01",
    stage_name: "Stage 01",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "pending"
  }
])

// Get tasks
const tasks = getTasks(repoRoot, "001-my-feature")

// Delete a workstream (with file locking for concurrent safety)
await deleteStream(repoRoot, "001-my-feature", { deleteFiles: true })

// Atomic read-modify-write with locking
await modifyIndex(repoRoot, (index) => {
  // Modify index safely
  return index.streams.length
})
```

Generated workstreams include version tracking in both the markdown templates and `index.json` metadata, making it easy to identify which tool versions created each workstream.

## Skills

Skills are agent-specific instructions stored in `~/agenv/agent/skills/`. Each skill has a `SKILL.md` file.

| Skill | Description |
|-------|-------------|
| `planning-workstreams` | How to create workstream plans |
| `implementing-workstreams` | How to execute tasks and update progress |
| `evaluating-workstreams` | How to evaluate results and generate reports |
| `reviewing-workstreams` | How to review plans and tasks |
| `synthesizing-workstreams` | How to synthesize session results |

Skills are installed to agent directories using `ag install skills`.

## Synthesis Agents

Synthesis agents are optional observer agents that run after working agent sessions to generate summaries. When enabled, `work multi` executes each thread in a two-phase process:

1. **Working Phase**: The working agent runs with full TUI visibility, allowing the user to interact with the session directly.
2. **Synthesis Phase**: After the working agent completes, the synthesis agent runs headless (in the background) to analyze the session and generate a summary.

### Enabling Synthesis Agents

1. Define synthesis agents in `work/agents.yaml`:

```yaml
synthesis_agents:
  - name: batch-synthesizer
    description: Summarizes working agent outputs after thread completion.
    best_for: Generating concise summaries of completed work.
    models: [anthropic/claude-sonnet-4-5]
```

2. Enable synthesis in `work/notifications.json` (opt-in):

```json
{
  "synthesis": {
    "enabled": true
  }
}
```

### Disabling Synthesis Agents

To disable synthesis agents, set `enabled: false` in `work/notifications.json` or remove the `synthesis_agents` section from `agents.yaml`. When disabled, `work multi` runs working agents normally without the post-session synthesis phase.

### How It Works

- The first synthesis agent in the list is used automatically
- The working agent runs first, and its session is tracked as the primary session
- Synthesis runs headless after the working agent completes
- Users always resume into the **working agent** session for review
- Synthesis output is stored in `threads.json` under `synthesisOutput`
- Future TTS integration will read synthesis summaries for audio notifications

## Usage from Agent Skills

Agent skills can use agenv packages by:

1. **CLI tools**: Use the `work` command (available after `install.sh`)
2. **Library imports**: Use `import { ... } from "@agenv/workstreams"` (requires path mapping)

This centralizes dependencies and logic while keeping skill directories simple.
