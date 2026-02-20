# Installation

## Prerequisites

- Bun
- Git
- macOS/Linux/WSL shell

## External Tools

- `opencode` CLI (required for execution commands like `work execute` and `work multi`)
- `tmux` (required for `work multi`)
- `gh` GitHub CLI (required for `work github` flows)
- `terminal-notifier` and `say` on macOS (optional; for notifications)

## Local Install

```bash
cd ~/agenv
bun install
./install.sh
```

This sets up `ag` and `work` in `~/agenv/bin` and adds it to your shell `PATH`.

## Optional Skill Install

```bash
./install.sh --with-skills
./install.sh --skills-all
./install.sh --skills-only
```

## Verify

```bash
ag --help
work --help
```
