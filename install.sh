#!/usr/bin/env bash
# LegalAnt installer — copies agents, commands, and skills into your Claude Code project
# Usage: ./install.sh [target-dir]   (defaults to current directory)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/legalant"
TARGET_DIR="${1:-$(pwd)}"
CLAUDE_DIR="$TARGET_DIR/.claude"

# ── Colour helpers ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[legalant]${NC} $*"; }
warn()  { echo -e "${YELLOW}[legalant]${NC} $*"; }
error() { echo -e "${RED}[legalant]${NC} $*" >&2; exit 1; }

# ── Validation ──────────────────────────────────────────────────────────────
[[ -d "$PLUGIN_DIR" ]] || error "Plugin source not found at $PLUGIN_DIR"
[[ -d "$TARGET_DIR" ]] || error "Target directory $TARGET_DIR does not exist"

info "Installing LegalAnt into: $TARGET_DIR"
echo ""

# ── 1. Agents ───────────────────────────────────────────────────────────────
AGENTS_SRC="$PLUGIN_DIR/agents"
AGENTS_DST="$CLAUDE_DIR/agents"

if [[ -d "$AGENTS_SRC" ]]; then
  mkdir -p "$AGENTS_DST"
  agent_count=0
  for f in "$AGENTS_SRC"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f")
    if [[ -f "$AGENTS_DST/$name" ]]; then
      warn "  Skipping agents/$name (already exists — delete to overwrite)"
    else
      cp "$f" "$AGENTS_DST/$name"
      info "  ✓ agents/$name"
      ((agent_count++))
    fi
  done
  info "  Agents: $agent_count installed"
else
  warn "No agents/ directory found in plugin — skipping"
fi
echo ""

# ── 2. Commands ─────────────────────────────────────────────────────────────
COMMANDS_SRC="$PLUGIN_DIR/commands"
COMMANDS_DST="$CLAUDE_DIR/commands"

if [[ -d "$COMMANDS_SRC" ]]; then
  mkdir -p "$COMMANDS_DST"
  cmd_count=0
  for f in "$COMMANDS_SRC"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f")
    if [[ -f "$COMMANDS_DST/$name" ]]; then
      warn "  Skipping commands/$name (already exists — delete to overwrite)"
    else
      cp "$f" "$COMMANDS_DST/$name"
      info "  ✓ commands/$name"
      ((cmd_count++))
    fi
  done
  info "  Commands: $cmd_count installed"
else
  warn "No commands/ directory found in plugin — skipping"
fi
echo ""

# ── 3. Skills ───────────────────────────────────────────────────────────────
SKILLS_SRC="$PLUGIN_DIR/skills"
SKILLS_DST="$CLAUDE_DIR/skills"

if [[ -d "$SKILLS_SRC" ]]; then
  mkdir -p "$SKILLS_DST"
  skill_count=0
  for skill_dir in "$SKILLS_SRC"/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"
    [[ -f "$skill_file" ]] || { warn "  Skipping $skill_name (no SKILL.md)"; continue; }
    dst_file="$SKILLS_DST/$skill_name.md"
    if [[ -f "$dst_file" ]]; then
      warn "  Skipping skills/$skill_name (already exists)"
    else
      cp "$skill_file" "$dst_file"
      info "  ✓ skills/$skill_name"
      ((skill_count++))
    fi
  done
  info "  Skills: $skill_count installed"
else
  warn "No skills/ directory found in plugin — skipping"
fi
echo ""

# ── 4. Rules (optional) ─────────────────────────────────────────────────────
RULES_SRC="$SCRIPT_DIR/rules"
RULES_DST="$CLAUDE_DIR/rules"

if [[ -d "$RULES_SRC" ]] && compgen -G "$RULES_SRC/*.md" > /dev/null 2>&1; then
  mkdir -p "$RULES_DST"
  rule_count=0
  for f in "$RULES_SRC"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f")
    cp "$f" "$RULES_DST/$name"
    info "  ✓ rules/$name"
    ((rule_count++))
  done
  info "  Rules: $rule_count installed"
fi
echo ""

# ── Summary ─────────────────────────────────────────────────────────────────
info "Installation complete."
info ""
info "Next steps:"
info "  1. Open your project in Claude Code"
info "  2. Type /matter to start your first LegalAnt matter"
info "  3. Respond to HITL gates with APPROVED or REVISE: [instructions]"
info ""
info "  Docs: https://github.com/appetals/legalant"
