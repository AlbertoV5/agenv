# AgEnv

A centralized Python+Bun environment for AI agents. This monorepo provides shared packages and libraries that can be used across different agent environments (Claude, Gemini, etc.).

## Structure

```
~/.agenv/
├── packages/           # Bun/TypeScript packages
│   ├── cli/            # Main CLI (@agenv/cli)
│   └── planning/       # Plan management library (@agenv/planning)
├── skills/             # Shared agent skills
│   ├── creating-plans/
│   ├── implementing-plans/
│   ├── evaluating-plans/
│   ├── documenting-plans/
│   └── reviewing-plans/
├── libraries/          # Python libraries (uv workspace)
└── services/           # Long-running services
```

## Installation

```bash
# Install CLI tools and add to PATH
~/.agenv/install.sh

# Install CLI + skills to ~/.claude/skills
~/.agenv/install.sh --with-skills

# Install skills to all agent directories (Claude, Gemini)
~/.agenv/install.sh --skills-all

# Reload shell or run:
source ~/.zshrc  # or ~/.bashrc
```

This adds `~/.agenv/bin` to your PATH and creates the `plan` command.

## CLI

AgEnv provides the `plan` command for plan management:

```bash
# Show help
plan --help

# Create a new plan
plan create --name my-feature

# Set current plan (avoids --plan on every command)
plan current --set "001-my-feature"
plan current                          # Show current plan
plan current --clear                  # Clear current plan

# Once current plan is set, all commands use it by default:
plan preview                          # Show PLAN.md structure
plan consolidate                      # Validate PLAN.md structure
plan add-task --stage 01 --Batch 01 --thread 01 --name "Task description"
plan list --tasks                     # List tasks with status
plan read --task "01.01.01.01"        # Read task details
plan update --task "01.01.01.01" --status completed
plan status                           # Show plan progress
plan complete                         # Mark plan as complete
plan view --open                      # Generate HTML visualization

# Metrics and analysis
plan metrics                          # Show plan metrics
plan metrics --blockers               # Show blocked tasks
plan metrics --filter "api"           # Filter tasks by pattern

# Reports and exports
plan report                           # Generate progress report
plan changelog --since-days 7         # Changelog from completed tasks
plan export --format csv              # Export to CSV

# Or specify a plan explicitly:
plan status --plan "001-my-feature"
```

### Task Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently working on |
| `completed` | Done |
| `blocked` | Cannot proceed (add note) |
| `cancelled` | Dropped (add reason) |

### Plan Statuses

| Status | Meaning | Set by |
|--------|---------|--------|
| `pending` | No tasks started | Computed |
| `in_progress` | Has tasks in progress | Computed |
| `completed` | All tasks completed | Computed |
| `on_hold` | Paused, won't work on for now | Manual |

```bash
# Put plan on hold
plan set-status on_hold

# Clear manual status (use computed)
plan set-status --clear
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

The main CLI package that provides the `plan` command for plan management (delegates to @agenv/planning).

### @agenv/planning

Plan management library for AI agents - create, track, and complete implementation plans.

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
  generatePlan,
  getPlanProgress,
  updateTask,
  completePlan,
  deletePlan,
  modifyIndex,
  generateVisualization,
  addTasks,
  getTasks,
  consolidatePlan
} from "@agenv/planning"

// Auto-detect repo root
const repoRoot = getRepoRoot()

// Create a plan (generates PLAN.md template and empty tasks.json)
const result = generatePlan({
  name: "my-feature",
  repoRoot
})

// Add tasks to a plan
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

// Delete a plan (with file locking for concurrent safety)
await deletePlan(repoRoot, "001-my-feature", { deleteFiles: true })

// Atomic read-modify-write with locking
await modifyIndex(repoRoot, (index) => {
  // Modify index safely
  return index.plans.length
})

// Generate HTML visualization
const { html, planCount } = generateVisualization({
  repoRoot,
  title: "My Plans"
})
```

Generated plans include version tracking in both the markdown templates and `index.json` metadata, making it easy to identify which tool versions created each plan.

## Skills

Skills are agent-specific instructions stored in `~/.agenv/skills/`. Each skill has a `SKILL.md` file and optionally a `scripts/` directory.

| Skill | Description |
|-------|-------------|
| `creating-plans` | How to create implementation plans for tasks |
| `implementing-plans` | How to follow and update plans during implementation |
| `evaluating-plans` | How to analyze plan metrics and identify blockers |
| `documenting-plans` | How to generate reports, changelogs, and exports |
| `reviewing-plans` | How to review and manage plan structure |

Skills are installed to agent directories using `ag install skills`.

## Synthesis Agents

Synthesis agents are optional observer agents that run after working agent sessions to generate summaries. When enabled, `work multi` executes each thread in a two-phase process:

1. **Working Phase**: The working agent runs with full TUI visibility, allowing the user to interact with the session directly.
2. **Synthesis Phase**: After the working agent completes, the synthesis agent runs headless (in the background) to analyze the session and generate a summary.

### Enabling Synthesis Agents

Add a `synthesis_agents` section to `work/agents.yaml`:

```yaml
agents:
  - name: default
    description: General-purpose implementation agent.
    best_for: Standard development tasks.
    models: [anthropic/claude-sonnet-4-5]

synthesis_agents:
  - name: batch-synthesizer
    description: Summarizes working agent outputs after thread completion.
    best_for: Generating concise summaries of completed work.
    models: [anthropic/claude-sonnet-4-5]
```

### Disabling Synthesis Agents

To disable synthesis agents, remove or comment out the `synthesis_agents` section. When disabled, `work multi` runs working agents normally without the post-session synthesis phase.

### How It Works

- The first synthesis agent in the list is used automatically
- The working agent runs first, and its session is tracked as the primary session
- Synthesis runs headless after the working agent completes
- Users always resume into the **working agent** session for review
- Synthesis output is stored in `threads.json` under `synthesisOutput`
- Future TTS integration will read synthesis summaries for audio notifications

## Usage from Agent Skills

Agent skills can use agenv packages by:

1. **CLI tools**: Use the `plan` command (available after `install.sh`)
2. **Library imports**: Use `import { ... } from "@agenv/planning"` (requires path mapping)

This centralizes dependencies and logic while keeping skill directories simple.
