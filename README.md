# AgEnv

A centralized Python+Bun environment for AI agents. This monorepo provides shared packages and libraries that can be used across different agent environments (Claude, Gemini, etc.).

## Structure

```
~/.agenv/
├── packages/           # Bun/TypeScript packages
│   └── planning/       # Plan management library
├── skills/             # Shared agent skills
│   ├── creating-plans/
│   └── implementing-plans/
├── libraries/          # Python libraries (uv workspace)
└── services/           # Long-running services
```

## Installation

```bash
# Install CLI tools and add to PATH
~/.agenv/install.sh

# Install CLI tools + skills to ~/.claude/skills
~/.agenv/install.sh --with-skills

# Install skills to all agent directories (Claude, Gemini)
~/.agenv/install.sh --skills-all

# Reload shell or run:
source ~/.zshrc  # or ~/.bashrc
```

This adds `~/.agenv/bin` to your PATH and creates symlinks for all CLI tools.

### Installing Skills Separately

```bash
# List available skills
~/.agenv/install-skills.sh --list

# Install to Claude (default)
~/.agenv/install-skills.sh --claude

# Install to Gemini
~/.agenv/install-skills.sh --gemini

# Install to all supported agents
~/.agenv/install-skills.sh --all

# Install to custom location
~/.agenv/install-skills.sh --target ~/my-agent/skills

# Preview what would be installed
~/.agenv/install-skills.sh --dry-run --all

# Clean install - remove all existing skills first
~/.agenv/install-skills.sh --clean --claude
```

## Packages

### @agenv/planning

Plan management library for AI agents - create, track, and complete implementation plans.

**CLI** (auto-detects repo root from cwd):

```bash
# Show help
plan --help

# Create a new plan
plan create --name my-feature --size medium

# Check plan status
plan status [--plan "plan-id"]

# Update a task
plan update --plan "plan-id" --task "1.2" --status completed

# Complete a plan
plan complete --plan "plan-id"

# Update plan metadata
plan index --plan "plan-id" --list
```

**Library Usage**:

```typescript
import {
  getRepoRoot,
  generatePlan,
  getPlanProgress,
  updateTask,
  completePlan
} from "@agenv/planning"

// Auto-detect repo root
const repoRoot = getRepoRoot()

// Create a plan
const result = generatePlan({
  name: "my-feature",
  size: "medium",
  repoRoot,
  stages: 3,
  supertasks: 2,
  subtasks: 3
})
```

## Skills

Skills are agent-specific instructions stored in `~/.agenv/skills/`. Each skill has a `SKILL.md` file and optionally a `scripts/` directory.

| Skill | Description |
|-------|-------------|
| `creating-plans` | How to create implementation plans for tasks |
| `implementing-plans` | How to follow and update plans during implementation |

Skills are installed to agent directories (`~/.claude/skills/`, `~/.gemini/skills/`) using the `install-skills.sh` script.

## Usage from Agent Skills

Agent skills can use agenv packages by:

1. **CLI tools**: Use the `plan` command (available after `install.sh`)
2. **Library imports**: Use `import { ... } from "@agenv/planning"` (requires path mapping)

This centralizes dependencies and logic while keeping skill directories simple.
