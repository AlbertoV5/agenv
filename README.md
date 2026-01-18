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
│   └── synthesizing-plans/
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

This adds `~/.agenv/bin` to your PATH and creates the `ag` command.

## CLI

AgEnv provides a unified `ag` command with subcommands:

```bash
# Show help
ag --help

# Plan management
ag plan create --name my-feature --size medium
ag plan status [--plan "plan-id"]
ag plan update --plan "plan-id" --task "1.2" --status completed
ag plan complete --plan "plan-id"
ag plan index --plan "plan-id" --list

# Skills installation
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

The main CLI package that provides the `ag` command. Routes to subcommands:
- `ag plan` - Plan management (delegates to @agenv/planning)
- `ag install` - Installation management (skills)

### @agenv/planning

Plan management library for AI agents - create, track, and complete implementation plans.

Generated plans include version tracking in both the markdown templates and `index.json` metadata, making it easy to identify which tool versions created each plan.

**Library Usage**:

```typescript
import {
  getRepoRoot,
  generatePlan,
  getPlanProgress,
  updateTask,
  completePlan,
  deletePlan,
  modifyIndex
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

// Delete a plan (with file locking for concurrent safety)
await deletePlan(repoRoot, "001-my-feature", { deleteFiles: true })

// Atomic read-modify-write with locking
await modifyIndex(repoRoot, (index) => {
  // Modify index safely
  return index.plans.length
})
```

## Skills

Skills are agent-specific instructions stored in `~/.agenv/skills/`. Each skill has a `SKILL.md` file and optionally a `scripts/` directory.

| Skill | Description |
|-------|-------------|
| `creating-plans` | How to create implementation plans for tasks |
| `implementing-plans` | How to follow and update plans during implementation |
| `synthesizing-plans` | How to synthesize plan reference docs into global docs |

Skills are installed to agent directories using `ag install skills`.

## Usage from Agent Skills

Agent skills can use agenv packages by:

1. **CLI tools**: Use the `ag` command (available after `install.sh`)
2. **Library imports**: Use `import { ... } from "@agenv/planning"` (requires path mapping)

This centralizes dependencies and logic while keeping skill directories simple.
