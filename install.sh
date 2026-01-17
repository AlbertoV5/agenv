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
    cd "$AGENV_HOME" && bun install --silent
    bun run "$AGENV_HOME/packages/cli/bin/ag.ts" install skills --all
    exit 0
fi

echo "Installing AgEnv..."

# Create bin directory
mkdir -p "$AGENV_BIN"

# Create symlink for the main `ag` command from cli package
echo "Creating ag command symlink..."
ln -sf "$AGENV_HOME/packages/cli/bin/ag.ts" "$AGENV_BIN/ag"
echo "  ag -> $AGENV_HOME/packages/cli/bin/ag.ts"

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
echo "  ag                  - Main CLI entry point"
echo "  ag plan             - Plan management"
echo "  ag install skills   - Install skills to agent directories"

# Install skills if requested
if [ "$INSTALL_SKILLS" = "true" ]; then
    echo ""
    if [ "$SKILLS_ALL" = "true" ]; then
        bun run "$AGENV_HOME/packages/cli/bin/ag.ts" install skills --all
    else
        bun run "$AGENV_HOME/packages/cli/bin/ag.ts" install skills --claude
    fi
fi

echo ""
echo "To use now, run:"
echo "  source $SHELL_CONFIG"
echo ""
echo "Or restart your terminal."
echo ""
echo "To install skills separately, run:"
echo "  ag install skills --help"
