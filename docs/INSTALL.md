# Installation Guide

This guide explains how to install and configure AgEnv using the provided installation script.

## Overview

The `install.sh` script sets up AgEnv on your system by:

1. Creating CLI command symlinks in `~/.agenv/bin`
2. Adding the bin directory to your shell's PATH
3. Configuring Claude agent environment for CLI access
4. Installing bun dependencies
5. Optionally installing skills to agent directories

## Requirements

- **Shell**: Bash or Zsh (the script auto-detects your shell)
- **Bun**: Required for dependency management and running the CLI tools
- **Git**: Recommended for cloning the repository
- **Operating System**: Unix-like system (macOS, Linux, WSL)

## Installation Location

AgEnv installs to `~/.agenv` with the following structure:

- `~/.agenv/bin/` - CLI command symlinks
- `~/.agenv/packages/` - Package source code
- `~/.agenv/env-setup.sh` - Environment configuration for Claude agents

## Usage

### Basic Installation

Run the installation script from the AgEnv directory:

```bash
~/.agenv/install.sh
```

This will:
- Create symlinks for `ag` and `work` commands
- Add `~/.agenv/bin` to your PATH
- Set up `CLAUDE_ENV_FILE` environment variable
- Install bun dependencies

After installation, reload your shell configuration:

```bash
source ~/.zshrc  # for zsh
source ~/.bashrc  # for bash
```

Or simply restart your terminal.

### Installation with Skills

To install skills to the default Claude agent directory (`~/.claude/skills`):

```bash
~/.agenv/install.sh --with-skills
```

To install skills to all supported agent directories:

```bash
~/.agenv/install.sh --skills-all
```

### Skills Only Installation

To only install skills without setting up the CLI:

```bash
~/.agenv/install.sh --skills-only
```

This is useful for updating skills after the initial installation.

## Available Commands After Installation

Once installed, you'll have access to:

- `ag` - Main CLI entry point for all AgEnv commands
- `ag work` - Workstream management commands
- `ag install skills` - Install skills to agent directories
- `work` - Standalone workstream CLI (alias for `ag work`)

## Command-Line Options

| Option | Description |
|--------|-------------|
| `--with-skills` | Install skills to `~/.claude/skills` directory |
| `--skills-all` | Install skills to all supported agent directories |
| `--skills-only` | Skip CLI setup and only install skills |

## Shell Configuration

The script automatically detects and updates your shell configuration:

- **Zsh**: Updates `~/.zshrc`
- **Bash**: Updates `~/.bash_profile` (if exists) or `~/.bashrc`
- **Other shells**: Updates `~/.profile`

Two entries are added to your shell configuration:

1. PATH export: `export PATH="$HOME/.agenv/bin:$PATH"`
2. Claude environment: `export CLAUDE_ENV_FILE="$HOME/.agenv/env-setup.sh"`

## Claude Agent Integration

The script creates `~/.agenv/env-setup.sh` which is sourced before each Bash command when using Claude Code or similar AI agents. This ensures that the `work` and `ag` commands are available in agent sessions.

## Troubleshooting

### Commands Not Found After Installation

If `ag` or `work` commands are not found after installation:

1. Verify the PATH was added:
   ```bash
   echo $PATH | grep .agenv
   ```

2. Reload your shell configuration:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

3. Check that symlinks exist:
   ```bash
   ls -la ~/.agenv/bin/
   ```

### Permission Denied Errors

If you encounter permission errors:

```bash
chmod +x ~/.agenv/install.sh
chmod +x ~/.agenv/packages/*/bin/*.ts
```

### Bun Not Installed

If bun is not installed, install it first:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then run the installation script again.

## Migration Notes

### Legacy `plan` Command

If you previously had a `plan` command from the deprecated planning package, the installation script automatically removes the legacy symlink and replaces it with the new workstream-based commands.

## Reinstallation

To reinstall or update AgEnv, simply run the installation script again:

```bash
~/.agenv/install.sh
```

The script is idempotent and will:
- Skip PATH configuration if already present
- Recreate/update symlinks
- Reinstall dependencies

## Manual Installation

If you need to perform manual installation steps:

1. Create bin directory:
   ```bash
   mkdir -p ~/.agenv/bin
   ```

2. Create symlinks:
   ```bash
   ln -sf ~/.agenv/packages/cli/bin/ag.ts ~/.agenv/bin/ag
   ln -sf ~/.agenv/packages/workstreams/bin/work.ts ~/.agenv/bin/work
   ```

3. Add to PATH in your shell config:
   ```bash
   echo 'export PATH="$HOME/.agenv/bin:$PATH"' >> ~/.zshrc
   ```

4. Install dependencies:
   ```bash
   cd ~/.agenv && bun install
   ```

## Next Steps

After installation, explore the available commands:

```bash
ag --help
ag work --help
work --help
```

To install skills for enhanced agent capabilities:

```bash
ag install skills --help
```
