#!/bin/bash
# AgEnv Skills Installation Script
#
# This script copies skills from ~/.agenv/skills to agent skill directories.
# By default, it installs to ~/.claude/skills.
#
# Usage:
#   ~/.agenv/install-skills.sh [options]
#
# Options:
#   --claude       Install to ~/.claude/skills (default)
#   --gemini       Install to ~/.gemini/skills
#   --all          Install to all supported agent directories
#   --target PATH  Install to a custom directory
#   --list         List available skills
#   --help         Show this help message

set -e

AGENV_HOME="${HOME}/.agenv"
AGENV_SKILLS="${AGENV_HOME}/skills"

# Default targets
CLAUDE_SKILLS="${HOME}/.claude/skills"
GEMINI_SKILLS="${HOME}/.gemini/skills"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_help() {
    cat << 'EOF'
AgEnv Skills Installer

Usage:
  install-skills.sh [options]

Options:
  --claude       Install to ~/.claude/skills (default if no option given)
  --gemini       Install to ~/.gemini/skills
  --all          Install to all supported agent directories
  --target PATH  Install to a custom directory
  --clean        Remove ALL existing skills in target before installing
  --list         List available skills without installing
  --dry-run      Show what would be installed without making changes
  --help, -h     Show this help message

Examples:
  # Install skills to Claude
  install-skills.sh --claude

  # Install to both Claude and Gemini
  install-skills.sh --all

  # Clean install - remove all existing skills first
  install-skills.sh --clean --claude

  # Install to a custom location
  install-skills.sh --target ~/my-agent/skills

  # List available skills
  install-skills.sh --list
EOF
}

list_skills() {
    echo "Available skills in ${AGENV_SKILLS}:"
    echo ""
    for skill_dir in "$AGENV_SKILLS"/*/; do
        if [ -d "$skill_dir" ]; then
            skill_name=$(basename "$skill_dir")
            if [ -f "${skill_dir}SKILL.md" ]; then
                # Extract description from SKILL.md frontmatter
                description=$(grep -A1 "^description:" "${skill_dir}SKILL.md" 2>/dev/null | head -1 | sed 's/^description: *//')
                echo "  ${skill_name}"
                if [ -n "$description" ]; then
                    echo "    └─ ${description}"
                fi
            else
                echo "  ${skill_name} (no SKILL.md)"
            fi
        fi
    done
}

clean_target() {
    local target_dir="$1"
    local dry_run="$2"

    if [ ! -d "$target_dir" ]; then
        return
    fi

    # Find all skill directories (directories containing SKILL.md)
    local removed_count=0
    for skill_dir in "$target_dir"/*/; do
        if [ -d "$skill_dir" ]; then
            skill_name=$(basename "$skill_dir")
            # Check if it's a skill directory (has SKILL.md)
            if [ -f "${skill_dir}SKILL.md" ]; then
                if [ "$dry_run" = "true" ]; then
                    echo "  [REMOVE] ${skill_name}"
                else
                    rm -rf "$skill_dir"
                    echo -e "  ${RED}✗${NC} ${skill_name} (removed)"
                fi
                ((removed_count++)) || true
            fi
        fi
    done

    if [ "$removed_count" -gt 0 ] && [ "$dry_run" != "true" ]; then
        echo -e "${YELLOW}Removed ${removed_count} existing skills${NC}"
    fi
}

install_skills_to() {
    local target_dir="$1"
    local dry_run="$2"
    local clean="$3"

    if [ ! -d "$AGENV_SKILLS" ]; then
        echo -e "${RED}Error: Source skills directory not found: ${AGENV_SKILLS}${NC}"
        exit 1
    fi

    # Count skills
    skill_count=$(find "$AGENV_SKILLS" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
    if [ "$skill_count" -eq 0 ]; then
        echo -e "${YELLOW}No skills found in ${AGENV_SKILLS}${NC}"
        return
    fi

    if [ "$dry_run" = "true" ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would install to: ${target_dir}"
    else
        echo "Installing skills to: ${target_dir}"
        mkdir -p "$target_dir"
    fi

    # Clean existing skills if requested
    if [ "$clean" = "true" ]; then
        if [ "$dry_run" = "true" ]; then
            echo -e "${YELLOW}[DRY RUN]${NC} Would remove existing skills:"
        else
            echo "Removing existing skills..."
        fi
        clean_target "$target_dir" "$dry_run"
        echo ""
    fi

    if [ "$dry_run" = "true" ]; then
        echo "Would install:"
    else
        echo "Installing:"
    fi

    for skill_dir in "$AGENV_SKILLS"/*/; do
        if [ -d "$skill_dir" ]; then
            skill_name=$(basename "$skill_dir")
            target_skill="${target_dir}/${skill_name}"

            if [ "$dry_run" = "true" ]; then
                if [ -d "$target_skill" ] && [ "$clean" != "true" ]; then
                    echo "  [UPDATE] ${skill_name}"
                else
                    echo "  [NEW]    ${skill_name}"
                fi
            else
                # Remove existing and copy fresh
                rm -rf "$target_skill"
                cp -r "$skill_dir" "$target_skill"
                echo -e "  ${GREEN}✓${NC} ${skill_name}"
            fi
        fi
    done

    if [ "$dry_run" != "true" ]; then
        echo -e "${GREEN}Done!${NC} Installed ${skill_count} skills to ${target_dir}"
    fi
}

# Parse arguments
TARGETS=()
DRY_RUN="false"
LIST_ONLY="false"
CLEAN="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --claude)
            TARGETS+=("$CLAUDE_SKILLS")
            shift
            ;;
        --gemini)
            TARGETS+=("$GEMINI_SKILLS")
            shift
            ;;
        --all)
            TARGETS+=("$CLAUDE_SKILLS")
            TARGETS+=("$GEMINI_SKILLS")
            shift
            ;;
        --target)
            if [ -z "$2" ]; then
                echo -e "${RED}Error: --target requires a path${NC}"
                exit 1
            fi
            TARGETS+=("$2")
            shift 2
            ;;
        --clean)
            CLEAN="true"
            shift
            ;;
        --list)
            LIST_ONLY="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help|-h)
            print_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            print_help
            exit 1
            ;;
    esac
done

# Handle list mode
if [ "$LIST_ONLY" = "true" ]; then
    list_skills
    exit 0
fi

# Default to Claude if no targets specified
if [ ${#TARGETS[@]} -eq 0 ]; then
    TARGETS+=("$CLAUDE_SKILLS")
fi

# Install to each target
for target in "${TARGETS[@]}"; do
    install_skills_to "$target" "$DRY_RUN" "$CLEAN"
    echo ""
done
