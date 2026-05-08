# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

LegalAnt is a Claude Code **plugin**, not a runtime application. There is no build, no test runner, and no server. Every "agent" is a Markdown spec file with YAML frontmatter — no Python or JS in the agent layer. The only executable code is:
- `install.sh` / `install-legalant.sh` — bash installers that copy plugin assets into `~/.claude/` or a target project's `.claude/`
- `mcp-servers/{pdf-ocr-processor,rbi-scraper,sebi-scraper}/index.js` — Node MCP servers (each has its own `package.json`)
- Per-matter `package.json` scripts that agents generate at runtime to render DOCX (created and deleted as throwaway code, not committed)

## Repository Layout (the part that matters)

```
legalant/                          ← repo root
  legalant/                        ← THE PLUGIN (this is what gets distributed)
    .claude-plugin/plugin.json
    agents/    ← 18 agent spec .md files (lexis + 4 layer-1 + 4 orchestrators + 5 practice + 4 utility)
    commands/  ← 16 slash commands that invoke those agents
    skills/{contract-basics,word-choice,universal-standards,indian-law-defaults}/SKILL.md
  .claude-plugin/marketplace.json  ← marketplace manifest (separate from the plugin's own manifest)
  .claude/agents/                  ← duplicates of legalant/agents/ — installed copy for local dev
  rules/                           ← extra .md skills that the plugin can't auto-distribute (installed via install.sh)
  schemas/                         ← JSON shapes for matter.json, hitl-log.json, dd-register.json, etc.
  mcp-servers/                     ← three Node MCP servers (pdf-ocr, rbi-scraper, sebi-scraper)
  matters/                         ← .gitignored runtime workspace; one folder per LA-YYYY-NNN matter
```

The duplicated content in `legalant/agents/` and `.claude/agents/` is intentional: `legalant/agents/` is the plugin source-of-truth that ships to users; `.claude/agents/` is the locally-installed copy. **Edits must be made to `legalant/agents/` and propagated** (the installer copies one to the other; do not assume one is canonical without checking the diff).

## Common Commands

```bash
# Install the plugin (and rules) into the current directory's .claude/
./install.sh                       # plugin only
./install.sh all                   # plugin + every practice-area rule
./install.sh inhouse transactions  # plugin + selected practice areas

# Install globally into ~/.claude (one-line installer, also accepts area args)
curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- all

# Validate a generated DOCX (agents are expected to call this after every render)
python scripts/office/validate.py <path-to.docx>
```

There is **no `npm test`, no lint, no CI**. The only "test" is a manual end-to-end matter run (see `matters/LA-2026-FINAL` or `LA-2026-TEST` for shape).

`scripts/office/validate.py` is referenced by every DOCX-generating agent but **is not present in this repo** — it is expected at runtime in the user's environment. Treat as an external dependency; do not try to add it unless asked.

## High-Level Architecture

### Three-tier agent topology (all routed through `lexis`)

`lexis` (Opus 4.5, in `legalant/agents/lexis.md`) is the **only** agent the user talks to. It runs a 4-dimension intake (Gate 1), produces an execution plan (Gate 2), and routes to specialists. Specialists never call each other directly — `lexis` synthesises and delivers via Gate 3.

- **Layer 1 — utility specialists** (single-purpose): `file-library-agent`, `legal-research-agent`, `translation-agent`, `redline-analysis-agent`, `chronology-builder-agent`, `document-table-agent`, `mca-documents-agent`, `document-review-agent`.
- **Layer 2 — workflow orchestrators**: `in-house-orchestrator`, `transactions-orchestrator`, `advisory-orchestrator`, `due-diligence-orchestrator`.
- **Layer 3 — practice-area orchestrators**: `litigation-`, `real-estate-`, `arbitration-`, `banking-finance-`, `capital-markets-orchestrator`.

Routing is hard-coded in the `lexis.md` "ROUTING LOGIC" table — when adding a new agent or input type, that table is the contract you are extending.

### Per-matter state (cross-session continuity)

Every matter lives at `matters/LA-YYYY-NNN/` with a `.legalant/` state directory. State files (shapes in `schemas/`):

- `matter.json` — written by `lexis` on Gate 1 approval; consulted at every session start to resume context.
- `hitl-log.json` — append-only audit trail; every gate decision logged.
- `index.json` — written by `file-library-agent` after document ingestion; **all other agents read this before touching any document**.
- `negotiation.json` — only `transactions-orchestrator` writes here; this is the only state that persists rounds across sessions.
- `dd-register.json` — `due-diligence-orchestrator` writes the Red Flag Register here.

**Session continuity rule**: `lexis` checks `.legalant/matter.json` at every session start. Never re-prompt for information already there.

### HITL gates are part of the contract

Gates are not optional. Three universal gates fire in `lexis` (Intake / Execution Plan / Final Output) plus a conditional Gate 4 for cross-agent conflicts. Each specialist also has its own gates documented in its `.md`.

**ABSOLUTE STOP gates** (no auto-approve, ever): court filings, SEBI filings, tribunal submissions, pre-signature execution packages. These are enforced by both `universal-standards/SKILL.md` and the relevant practice-area orchestrator. Never add code, instructions, or a "default approved" path that bypasses these.

Valid responses are exactly `APPROVED` or `REVISE: [instructions]`. Silence ≠ approval.

### DOCX rendering pattern (every agent that produces output)

Agents do not have a shared rendering library. Each one **generates a throwaway Node script in the matter's outputs folder, runs it, validates, then deletes it**:

1. `cd matters/<id>/outputs && npm init -y && npm install docx`
2. Write a `generate-*.js` that uses the `docx` npm module.
3. Run the script → produces `.docx`.
4. `python scripts/office/validate.py <docx>` → fix any XML errors before continuing.
5. Write a self-contained HTML viewer (no CDNs, no external links) to the same folder.
6. Delete `node_modules`, `package.json`, `package-lock.json`, and the script.
7. Print exactly:
   ```
   ✅ [type] complete.
   → Artifact: …<file>.html
   → Report:   …<file>.docx
   ```
   No companion `-download.html`, no "open to download" line.

### DOCX hard rules (non-negotiable, copied from `universal-standards/SKILL.md` and CONTRIBUTING.md)

```
PAGE_WIDTH=11906  MARGIN=1440  CONTENT_W=9026  (must equal PAGE_WIDTH - 2*MARGIN)
FONT_BODY='Times New Roman'  SIZE_BODY=22 (half-points = 11pt)
FILL_RED='F4CCCC'  FILL_AMBER='FCE5CD'  FILL_GREEN='D9EAD3'
```

- `ShadingType.CLEAR` always — **never** `ShadingType.SOLID`.
- `color: 'auto'` on every shading element — never the fill hex.
- Every `Table` constructor must receive `columnWidths: […]` whose sum equals **exactly** 9026.
- Never put `\n` inside a `TextRun` — use separate `Paragraph` elements.
- For numbered lists, prepend `"1.  "` as a `TextRun`; do not use `docx`'s numbering system (buggy in v9).
- CONTRIBUTING.md says "never use HeadingLevel — use plain Paragraph with explicit border.bottom"; `lexis.md` itself imports and uses HeadingLevel. Treat the CONTRIBUTING rule as the intent for **new** agents and tables; mirror existing patterns when extending old ones.

### HTML viewer design constants

Every agent's HTML output uses the same chrome: 52px top bar `#1F3864`, 220px left sidebar `#F0EDE6`, body font Georgia, UI font Segoe UI, IntersectionObserver-driven active nav, fully self-contained. The Download button must be `<a href="<file>.docx" download="…">⬇  Download Report</a>`. No CDN, no external links — agents render into clients with no internet access.

## Universal Standards (apply to every agent)

Loaded from `legalant/skills/universal-standards/SKILL.md` on every invocation:

1. **HITL** — present output and stop; explicit `APPROVED` or `REVISE`.
2. **Citation completeness** — every factual claim cites document + page + section. Unverifiable → "Unable to verify — recommend manual confirmation." Never fabricate.
3. **Hallucination defence** — if a case/statute/circular cannot be verified from uploads, MCP databases, or matter state, say so. Do not invent.
4. **Indian law default** — every agent assumes Indian jurisdiction unless overridden. Auto-trigger FEMA when foreign counterparty detected; SEBI LODR when listed entity detected; MCA verification when contract value > ₹10L.
5. **Data security** — no document content sent to third-party services without explicit advocate approval.
6. **Mandatory disclaimer** on every output: "This output is produced by LegalAnt AI. It does not constitute legal advice and must be reviewed by a qualified advocate before reliance or external communication."

## Word-Choice Rule (redline / drafting)

Modal verb shifts (SHALL ↔ WILL ↔ WOULD ↔ MAY ↔ COULD ↔ MUST) are **automatically Substantive** in any redline diff regardless of context. `redline-analysis-agent` and any contract-touching agent must flag every shift with: original verb → replacement verb → legal consequence → recommended correction. See `legalant/skills/word-choice/SKILL.md`.

## When Adding or Editing an Agent

1. Edit the spec under `legalant/agents/<agent>.md` (frontmatter: `name`, `description`, `model`, `tools`).
2. If new behavior, add a matching `legalant/commands/<cmd>.md` that delegates via `$ARGUMENTS`.
3. If `lexis` needs to route to it, add a row to the ROUTING LOGIC table in `legalant/agents/lexis.md`.
4. If new state, define the JSON shape in `schemas/` and document who writes it in this file's "Per-matter state" section.
5. Mirror to `.claude/agents/<agent>.md` (or rerun `./install.sh` from the project root).
6. If new rules ship outside the plugin, add them to both `rules/` and the `install_rules` cases in `install.sh` **and** `install-legalant.sh`.

## .env / Integrations

- Phase 1 (default): `GOOGLE_CREDENTIALS_PATH`, `N8N_WEBHOOK_URL`. Everything works without paid APIs — case law via indiankanoon.org search, MCA via HITL portal walkthrough, RBI/SEBI via the `mcp-servers/` scrapers.
- Phase 2A: `KANOON_API_TOKEN` (Indian Kanoon paid API).
- Phase 2B: `FINANVO_ACCESS_KEY`, `FINANVO_ACCESS_SECRET` (MCA V3 automation).

Phase 2 keys are pure drop-ins — no agent code changes required.

## What Is Deliberately Not Here

- No build, no lint, no test runner. Adding one is out of scope unless explicitly requested.
- No CI. PRs are reviewed manually against CONTRIBUTING.md's DOCX standards.
- `matters/` is `.gitignored`; runtime artifacts (DOCX, PDF, `.legalant/` state, per-matter `node_modules`) must never be committed.
