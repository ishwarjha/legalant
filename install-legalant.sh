#!/usr/bin/env bash
# LegalAnt — one-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash
# Or with practice areas:
# curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- inhouse transactions
# curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- all

set -e

REPO="ishwarjha/legalant"
BRANCH="main"
RAW_BASE="https://raw.githubusercontent.com/$REPO/$BRANCH"
CLAUDE_SKILLS="$HOME/.claude/skills"
CLAUDE_AGENTS="$HOME/.claude/agents"
PLUGIN_DIR="$HOME/.claude/plugins"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✓${RESET} $1"; }
info() { echo -e "${BLUE}  →${RESET} $1"; }
warn() { echo -e "${YELLOW}  ⚠${RESET} $1"; }
fail() { echo -e "${RED}  ✗${RESET} $1"; }

# ── header ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}⚖  LegalAnt Installer${RESET}"
echo -e "   18-agent AI system for Indian legal work"
echo -e "   github.com/$REPO"
echo ""

# ── check dependencies ────────────────────────────────────────────────────────
info "Checking dependencies..."

if ! command -v curl &>/dev/null; then
  fail "curl is required but not installed. Install it and try again."
  exit 1
fi
ok "curl found"

if ! command -v claude &>/dev/null; then
  warn "Claude Code not found in PATH. Rules will still install — add Claude Code later."
  CLAUDE_FOUND=false
else
  ok "Claude Code found"
  CLAUDE_FOUND=true
fi

# ── parse practice areas ──────────────────────────────────────────────────────
AREAS=("$@")
if [[ "${#AREAS[@]}" -eq 0 ]]; then
  AREAS=("core")
  warn "No practice area specified. Installing core rules only."
  warn "For everything: curl -fsSL $RAW_BASE/install-legalant.sh | bash -s -- all"
fi

# ── create directories ────────────────────────────────────────────────────────
echo ""
info "Creating directories..."
mkdir -p "$CLAUDE_SKILLS"
mkdir -p "$CLAUDE_AGENTS"
mkdir -p "$PLUGIN_DIR"
ok "Directories ready"

# ── download helper ───────────────────────────────────────────────────────────
download() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  if curl -fsSL "$RAW_BASE/$src" -o "$dst" 2>/dev/null; then
    ok "$src"
  else
    fail "$src (download failed — check your connection)"
  fi
}

# ── install plugin manifest ───────────────────────────────────────────────────
echo ""
info "Installing plugin..."
download "legalant/.claude-plugin/plugin.json" "$PLUGIN_DIR/legalant/.claude-plugin/plugin.json"
download "legalant/agents/lexis.md"                     "$PLUGIN_DIR/legalant/agents/lexis.md"
download "legalant/agents/document-review-agent.md"     "$PLUGIN_DIR/legalant/agents/document-review-agent.md"
download "legalant/agents/legal-research-agent.md"      "$PLUGIN_DIR/legalant/agents/legal-research-agent.md"
download "legalant/agents/redline-analysis-agent.md"    "$PLUGIN_DIR/legalant/agents/redline-analysis-agent.md"
download "legalant/agents/translation-agent.md"         "$PLUGIN_DIR/legalant/agents/translation-agent.md"
download "legalant/agents/mca-documents-agent.md"       "$PLUGIN_DIR/legalant/agents/mca-documents-agent.md"
download "legalant/agents/file-library-agent.md"        "$PLUGIN_DIR/legalant/agents/file-library-agent.md"
download "legalant/agents/chronology-builder-agent.md"  "$PLUGIN_DIR/legalant/agents/chronology-builder-agent.md"
download "legalant/agents/document-table-agent.md"      "$PLUGIN_DIR/legalant/agents/document-table-agent.md"
download "legalant/agents/in-house-orchestrator.md"     "$PLUGIN_DIR/legalant/agents/in-house-orchestrator.md"
download "legalant/agents/transactions-orchestrator.md" "$PLUGIN_DIR/legalant/agents/transactions-orchestrator.md"
download "legalant/agents/advisory-orchestrator.md"     "$PLUGIN_DIR/legalant/agents/advisory-orchestrator.md"
download "legalant/agents/due-diligence-orchestrator.md" "$PLUGIN_DIR/legalant/agents/due-diligence-orchestrator.md"

download "legalant/commands/matter.md"     "$PLUGIN_DIR/legalant/commands/matter.md"
download "legalant/commands/review.md"     "$PLUGIN_DIR/legalant/commands/review.md"
download "legalant/commands/research.md"   "$PLUGIN_DIR/legalant/commands/research.md"
download "legalant/commands/redline.md"    "$PLUGIN_DIR/legalant/commands/redline.md"
download "legalant/commands/translate.md"  "$PLUGIN_DIR/legalant/commands/translate.md"
download "legalant/commands/mca.md"        "$PLUGIN_DIR/legalant/commands/mca.md"
download "legalant/commands/chronology.md" "$PLUGIN_DIR/legalant/commands/chronology.md"
download "legalant/commands/extract.md"    "$PLUGIN_DIR/legalant/commands/extract.md"
download "legalant/commands/negotiate.md"  "$PLUGIN_DIR/legalant/commands/negotiate.md"
download "legalant/commands/advise.md"     "$PLUGIN_DIR/legalant/commands/advise.md"
download "legalant/commands/dd.md"         "$PLUGIN_DIR/legalant/commands/dd.md"
download "legalant/commands/inhouse.md"    "$PLUGIN_DIR/legalant/commands/inhouse.md"
download "legalant/commands/index.md"      "$PLUGIN_DIR/legalant/commands/index.md"

download "legalant/skills/contract-basics/SKILL.md"      "$PLUGIN_DIR/legalant/skills/contract-basics/SKILL.md"
download "legalant/skills/word-choice/SKILL.md"           "$PLUGIN_DIR/legalant/skills/word-choice/SKILL.md"
download "legalant/skills/universal-standards/SKILL.md"   "$PLUGIN_DIR/legalant/skills/universal-standards/SKILL.md"
download "legalant/skills/indian-law-defaults/SKILL.md"   "$PLUGIN_DIR/legalant/skills/indian-law-defaults/SKILL.md"

# ── install rules by practice area ───────────────────────────────────────────
install_rules() {
  local area="$1"
  case "$area" in
    core)
      info "Installing core rules..."
      download "rules/contract-basics.md"     "$CLAUDE_SKILLS/contract-basics.md"
      download "rules/word-choice.md"         "$CLAUDE_SKILLS/word-choice.md"
      download "rules/universal-standards.md" "$CLAUDE_SKILLS/universal-standards.md"
      download "rules/indian-law-defaults.md" "$CLAUDE_SKILLS/indian-law-defaults.md"
      download "rules/hitl-protocol.md"       "$CLAUDE_SKILLS/hitl-protocol.md"
      download "rules/citation-standards.md"  "$CLAUDE_SKILLS/citation-standards.md"
      ;;
    inhouse)
      info "Installing in-house rules..."
      download "rules/inhouse-contract-types.md"   "$CLAUDE_SKILLS/inhouse-contract-types.md"
      download "rules/inhouse-two-layer-output.md" "$CLAUDE_SKILLS/inhouse-two-layer-output.md"
      ;;
    transactions)
      info "Installing transactions rules..."
      download "rules/negotiation-position-matrix.md" "$CLAUDE_SKILLS/negotiation-position-matrix.md"
      download "rules/deal-structure-brief.md"        "$CLAUDE_SKILLS/deal-structure-brief.md"
      ;;
    advisory)
      info "Installing advisory rules..."
      download "rules/regulatory-perimeter.md"  "$CLAUDE_SKILLS/regulatory-perimeter.md"
      download "rules/three-pillars-quality.md" "$CLAUDE_SKILLS/three-pillars-quality.md"
      ;;
    dd|due-diligence)
      info "Installing due diligence rules..."
      download "rules/dd-streams.md"             "$CLAUDE_SKILLS/dd-streams.md"
      download "rules/red-flag-register.md"      "$CLAUDE_SKILLS/red-flag-register.md"
      download "rules/change-of-control-map.md"  "$CLAUDE_SKILLS/change-of-control-map.md"
      ;;
    litigation)
      info "Installing litigation rules..."
      download "rules/pleading-standards.md"    "$CLAUDE_SKILLS/pleading-standards.md"
      download "rules/court-filing-protocol.md" "$CLAUDE_SKILLS/court-filing-protocol.md"
      ;;
    realestate|real-estate)
      info "Installing real estate rules..."
      download "rules/title-search-protocol.md"  "$CLAUDE_SKILLS/title-search-protocol.md"
      download "rules/property-doc-checklist.md" "$CLAUDE_SKILLS/property-doc-checklist.md"
      ;;
    arbitration)
      info "Installing arbitration rules..."
      download "rules/arbitration-act-checklist.md" "$CLAUDE_SKILLS/arbitration-act-checklist.md"
      download "rules/tribunal-filing-protocol.md"  "$CLAUDE_SKILLS/tribunal-filing-protocol.md"
      ;;
    banking|banking-finance)
      info "Installing banking & finance rules..."
      download "rules/rbi-master-directions.md" "$CLAUDE_SKILLS/rbi-master-directions.md"
      download "rules/fema-compliance.md"        "$CLAUDE_SKILLS/fema-compliance.md"
      ;;
    capital|capital-markets)
      info "Installing capital markets rules..."
      download "rules/sebi-icdr-checklist.md" "$CLAUDE_SKILLS/sebi-icdr-checklist.md"
      download "rules/ipo-workflow.md"         "$CLAUDE_SKILLS/ipo-workflow.md"
      ;;
    all)
      install_rules core
      install_rules inhouse
      install_rules transactions
      install_rules advisory
      install_rules dd
      install_rules litigation
      install_rules realestate
      install_rules arbitration
      install_rules banking
      install_rules capital
      ;;
    *)
      warn "Unknown area '$area' — skipping"
      ;;
  esac
}

echo ""
# Core always installs first
install_rules core

# Then any additional areas
for area in "${AREAS[@]}"; do
  [[ "$area" != "core" ]] && install_rules "$area"
done

# ── register plugin with Claude Code ─────────────────────────────────────────
if [[ "$CLAUDE_FOUND" == true ]]; then
  echo ""
  info "Registering plugin with Claude Code..."
  if claude plugin add --local "$PLUGIN_DIR/legalant" 2>/dev/null; then
    ok "Plugin registered"
  else
    warn "Could not auto-register. Add manually in Claude Code:"
    warn "  /plugin marketplace add ishwarjha/legalant"
    warn "  /plugin install legalant@legalant-marketplace"
  fi
fi

# ── done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}⚖  LegalAnt installed successfully.${RESET}"
echo ""
echo -e "  Restart Claude Code to load the plugin."
echo ""
echo -e "  Then try:"
echo -e "${BOLD}  /legalant:matter \"Review this NDA\"${RESET}"
echo ""
echo -e "  All 13 commands:"
echo -e "  /legalant:matter  /legalant:review    /legalant:research"
echo -e "  /legalant:redline /legalant:translate  /legalant:mca"
echo -e "  /legalant:inhouse /legalant:negotiate  /legalant:advise"
echo -e "  /legalant:dd      /legalant:chronology /legalant:extract"
echo -e "  /legalant:index"
echo ""
echo -e "  Docs: https://github.com/$REPO"
echo ""
