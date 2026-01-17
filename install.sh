#!/bin/bash
# AgEnv Installation Script
#
# This script:
# 1. Adds ~/.agenv/bin to PATH
# 2. Creates symlinks for all package CLI tools
# 3. Updates shell configuration (.zshrc, .bashrc)
# 4. Optionally installs skills to agent directories
#
# Usage:
#   ~/.agenv/install.sh [options]
#
# Options:
#   --with-skills     Also install skills to ~/.claude/skills
#   --skills-all      Install skills to all agent directories
#   --skills-only     Only install skills, skip CLI setup

set -e

AGENV_HOME="${HOME}/.agenv"
AGENV_BIN="${AGENV_HOME}/bin"

# Parse arguments
INSTALL_SKILLS="false"
SKILLS_ALL="false"
SKILLS_ONLY="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-skills)
            INSTALL_SKILLS="true"
            shift
            ;;
        --skills-all)
            INSTALL_SKILLS="true"
            SKILLS_ALL="true"
            shift
            ;;
        --skills-only)
            SKILLS_ONLY="true"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Skip CLI setup if --skills-only
if [ "$SKILLS_ONLY" = "true" ]; then
    if [ -x "$AGENV_HOME/install-skills.sh" ]; then
        "$AGENV_HOME/install-skills.sh" --all
    fi
    exit 0
fi

echo "Installing AgEnv..."

# Create bin directory
mkdir -p "$AGENV_BIN"

# Find all bin scripts in packages and create symlinks
echo "Creating command symlinks..."

for pkg_bin in "$AGENV_HOME"/packages/*/bin/*.ts; do
    if [ -f "$pkg_bin" ]; then
        # Get the command name (e.g., plan-create from plan-create.ts)
        cmd_name=$(basename "$pkg_bin" .ts)

        # Create symlink in agenv/bin
        ln -sf "$pkg_bin" "$AGENV_BIN/$cmd_name"
        echo "  $cmd_name -> $pkg_bin"
    fi
done

# Detect shell and config file
detect_shell_config() {
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
        echo "$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
        if [ -f "$HOME/.bash_profile" ]; then
            echo "$HOME/.bash_profile"
        else
            echo "$HOME/.bashrc"
        fi
    else
        echo "$HOME/.profile"
    fi
}

SHELL_CONFIG=$(detect_shell_config)
EXPORT_LINE='export PATH="$HOME/.agenv/bin:$PATH"'

# Check if PATH is already configured
if grep -q '\.agenv/bin' "$SHELL_CONFIG" 2>/dev/null; then
    echo "PATH already configured in $SHELL_CONFIG"
else
    echo "" >> "$SHELL_CONFIG"
    echo "# AgEnv - AI Agent Environment" >> "$SHELL_CONFIG"
    echo "$EXPORT_LINE" >> "$SHELL_CONFIG"
    echo "Added PATH to $SHELL_CONFIG"
fi

# Install bun dependencies if needed
if [ -f "$AGENV_HOME/package.json" ]; then
    echo "Installing dependencies..."
    cd "$AGENV_HOME" && bun install --silent
fi

echo ""
echo "AgEnv installed successfully!"
echo ""
echo "Available commands:"
for cmd in "$AGENV_BIN"/*; do
    if [ -f "$cmd" ]; then
        echo "  $(basename "$cmd")"
    fi
done

# Install skills if requested
if [ "$INSTALL_SKILLS" = "true" ]; then
    echo ""
    if [ -x "$AGENV_HOME/install-skills.sh" ]; then
        if [ "$SKILLS_ALL" = "true" ]; then
            "$AGENV_HOME/install-skills.sh" --all
        else
            "$AGENV_HOME/install-skills.sh" --claude
        fi
    else
        echo "Warning: install-skills.sh not found or not executable"
    fi
fi

echo ""
echo "To use now, run:"
echo "  source $SHELL_CONFIG"
echo ""
echo "Or restart your terminal."
echo ""
echo "To install skills separately, run:"
echo "  ~/.agenv/install-skills.sh --help"
