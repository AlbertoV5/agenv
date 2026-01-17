# AgEnv

A centralized Python+Bun environment for AI agents. This monorepo provides shared packages and libraries that can be used across different agent environments (Claude, Gemini, etc.).

## Structure

```
~/.agenv/
├── packages/           # Bun/TypeScript packages
│   └── planning/       # Plan management library
├── libraries/          # Python libraries (uv workspace)
└── services/           # Long-running services
```

## Installation

```bash
# Install agenv and add commands to PATH
~/.agenv/install.sh

# Reload shell or run:
source ~/.zshrc  # or ~/.bashrc
```

This adds `~/.agenv/bin` to your PATH and creates symlinks for all CLI tools.

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

## Usage from Agent Skills

Agent skills (in `~/.claude/skills/`, `~/.gemini/skills/`, etc.) can:

1. **Call CLI tools directly**: Reference `~/.agenv/packages/planning/bin/*.ts`
2. **Import as library**: Use `import { ... } from "@agenv/planning"` (requires path mapping)
3. **Use wrapper scripts**: Skills can have thin wrappers that import from agenv

This centralizes dependencies and logic while keeping skill directories simple.
