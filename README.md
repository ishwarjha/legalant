# LegalAnt

LegalAnt is an 18-agent AI system for Indian legal work. It handles contract review, legal research, translation, redline analysis, negotiation tracking, MCA due diligence, and five practice area workflows, all as a Claude Code plugin.

---

## Prerequisites

**All platforms:** [Claude Code](https://claude.ai/code), a Claude account (Pro or higher for Opus calls), and Git.

**macOS / Linux:** Nothing else needed.

**Windows:** You need one of the following before running any install commands.

- **Git Bash** (recommended): comes with [Git for Windows](https://git-scm.com/download/win) and lets you run `./install.sh` as written.
- **WSL**: run all commands in your WSL terminal unchanged.
- **PowerShell 5.1+**: built into Windows 10/11. Check your version:

```powershell
$PSVersionTable.PSVersion
```

Anything 5.1 or above works.

---

## Quick Start

### Step 1: Install the Plugin

Open Claude Code and run:

```
/plugin marketplace add ishwarjha/legalant
/plugin install legalant@legalant-marketplace
```

Restart Claude Code when prompted.

### Step 2: Install Rules

Claude Code plugins can't distribute `rules` automatically. You install them once.

**macOS / Linux**

```bash
git clone https://github.com/ishwarjha/legalant.git
cd legalant

./install.sh inhouse transactions   # specific practice areas
./install.sh all                    # everything
./install.sh --target cursor all    # Cursor instead of Claude Code
```

**Windows, Git Bash or WSL**

Open Git Bash or your WSL terminal and run the macOS commands above. Both handle `./install.sh` without changes.

**Windows, PowerShell**

```powershell
git clone https://github.com/ishwarjha/legalant.git
cd legalant

New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"

# Core rules, always required
Copy-Item rules\contract-basics.md        "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\word-choice.md            "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\universal-standards.md    "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\indian-law-defaults.md    "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\hitl-protocol.md          "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\citation-standards.md     "$env:USERPROFILE\.claude\skills\"
```

Then add whichever practice area rules you need:

```powershell
# In-house
Copy-Item rules\inhouse-contract-types.md    "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\inhouse-two-layer-output.md  "$env:USERPROFILE\.claude\skills\"

# Transactions
Copy-Item rules\negotiation-position-matrix.md "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\deal-structure-brief.md        "$env:USERPROFILE\.claude\skills\"

# Advisory
Copy-Item rules\regulatory-perimeter.md   "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\three-pillars-quality.md  "$env:USERPROFILE\.claude\skills\"

# Due diligence
Copy-Item rules\dd-streams.md            "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\red-flag-register.md     "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\change-of-control-map.md "$env:USERPROFILE\.claude\skills\"

# Litigation
Copy-Item rules\pleading-standards.md    "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\court-filing-protocol.md "$env:USERPROFILE\.claude\skills\"

# Arbitration
Copy-Item rules\arbitration-act-checklist.md "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\tribunal-filing-protocol.md  "$env:USERPROFILE\.claude\skills\"

# Real estate
Copy-Item rules\title-search-protocol.md  "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\property-doc-checklist.md "$env:USERPROFILE\.claude\skills\"

# Banking and finance
Copy-Item rules\rbi-master-directions.md "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\fema-compliance.md        "$env:USERPROFILE\.claude\skills\"

# Capital markets
Copy-Item rules\sebi-icdr-checklist.md "$env:USERPROFILE\.claude\skills\"
Copy-Item rules\ipo-workflow.md         "$env:USERPROFILE\.claude\skills\"
```

Restart Claude Code after copying rules.

### Step 3: Start Using

```
/legalant:matter "NDA with Singapore technology company"

/legalant:review

/legalant:research "Enforceability of pre-arbitration conciliation clauses under Indian law"

/plugin list legalant@legalant-marketplace
```

You now have 13 agents, 4 bundled skills, and 13 commands.

---

## One-Line Install (macOS, Linux, Git Bash, WSL)

```bash
curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash

curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- all

curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- inhouse transactions
```

The curl installer doesn't run in native PowerShell. Use Git Bash, WSL, or the PowerShell steps in Step 2.

---

## Commands

| Command                | What it does                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `/legalant:matter`     | Start a new matter. `lexis` reads intake and routes to the right agent.              |
| `/legalant:review`     | 4-layer CONTRACT review of an attached contract.                                     |
| `/legalant:research`   | Legal research across indiankanoon.org, RBI, and SEBI.                               |
| `/legalant:redline`    | Single-file quality audit or two-file version comparison.                            |
| `/legalant:translate`  | Legal translation with structure preserved and Translator's Notes for tricky terms.  |
| `/legalant:mca`        | MCA due diligence: guided portal lookup plus a 10-category analysis with RAG rating. |
| `/legalant:chronology` | Build a matter timeline from uploaded documents.                                     |
| `/legalant:extract`    | Bulk field extraction using a DD schema or your own.                                 |
| `/legalant:negotiate`  | Start or resume a multi-round negotiation. State persists across sessions.           |
| `/legalant:advise`     | Multi-regulator advisory across RBI, SEBI, MCA, FEMA, IRDAI, and the DPDP Act.       |
| `/legalant:dd`         | Full due diligence with Red Flag Register and Change of Control Map.                 |
| `/legalant:inhouse`    | In-house review with two outputs: full legal analysis and a plain-language brief.    |
| `/legalant:index`      | Index documents into the matter library.                                             |

---

## Agents

All 13 agents run as Claude Code subagents. `lexis` is the only one you talk to. The rest run internally based on what the matter needs.

**Specialist agents**

`lexis` (Opus) reads every matter, classifies it, and routes to the right agent or orchestrator. `document-review-agent` (Opus) runs the 4-layer CONTRACT protocol. `legal-research-agent` (Opus) searches case law, RBI, and SEBI sources and verifies every citation before it delivers anything. `redline-analysis-agent` (Opus) audits a single contract or compares two versions clause by clause. `translation-agent` (Sonnet) handles 200+ languages and adds Translator's Notes for terms that don't carry across cleanly. `mca-documents-agent` (Opus) walks you through the MCA portal and produces a 10-category summary with RAG rating. `file-library-agent` (Haiku) indexes every document upload before any other agent touches it. `chronology-builder-agent` and `document-table-agent` (both Haiku) handle timelines and bulk field extraction.

**Practice orchestrators**

`in-house-orchestrator` (Sonnet) covers listed companies, MNCs, and startups. It always produces two outputs: a full legal analysis for the GC and a plain-language brief for the business head. `transactions-orchestrator` (Haiku) manages multi-round negotiations and is the only agent that keeps state between sessions, via `negotiation.json`. `advisory-orchestrator` (Sonnet) maps every applicable regulator before researching anything. `due-diligence-orchestrator` (Haiku) splits documents into four parallel streams and builds the Red Flag Register.

---

## Bundled Skills

Four skills install with the plugin and load automatically when relevant.

`contract-basics` runs the 8-point CONTRACT checklist on every contract review. `word-choice` tracks the modal verb taxonomy (SHALL / WILL / WOULD / MAY) and flags every verb shift in redline comparisons. `universal-standards` enforces HITL protocol, citation requirements, hallucination defence, and data security across every agent. `indian-law-defaults` loads the Indian statute and regulatory hierarchy for any matter under Indian law.

---

## Rules

Rules extend the plugin's behaviour in your editor. The plugin doesn't install them automatically. You run `install.sh` once on macOS, Linux, Git Bash, or WSL. On Windows PowerShell, use the `Copy-Item` commands in Step 2.

```
rules/
  contract-basics.md              ← CONTRACT mnemonic (core)
  word-choice.md                  ← Modal verb taxonomy (core)
  universal-standards.md          ← HITL, citation, hallucination defence (core)
  indian-law-defaults.md          ← Indian statutes and regulatory framework (core)
  hitl-protocol.md                ← HITL gate behaviour (core)
  citation-standards.md           ← Citation format (core)
  inhouse-contract-types.md       ← 17 contract classifications (inhouse)
  inhouse-two-layer-output.md     ← Two-layer output format (inhouse)
  negotiation-position-matrix.md  ← Position matrix schema (transactions)
  deal-structure-brief.md         ← 6-dimension deal structure (transactions)
  regulatory-perimeter.md         ← Regulator mapping protocol (advisory)
  three-pillars-quality.md        ← Three Pillars quality check (advisory)
  dd-streams.md                   ← Four parallel DD streams (dd)
  red-flag-register.md            ← Red flag categories (dd)
  change-of-control-map.md        ← Change of control mapping (dd)
  pleading-standards.md           ← Pleading format (litigation)
  court-filing-protocol.md        ← Court filing absolute stop (litigation)
  arbitration-act-checklist.md    ← Arbitration Act s.21 checklist (arbitration)
  tribunal-filing-protocol.md     ← Tribunal filing gate (arbitration)
  title-search-protocol.md        ← Title search steps (real estate)
  property-doc-checklist.md       ← Property document checklist (real estate)
  rbi-master-directions.md        ← RBI regulatory framework (banking)
  fema-compliance.md              ← FEMA compliance rules (banking)
  sebi-icdr-checklist.md          ← SEBI ICDR requirements (capital markets)
  ipo-workflow.md                 ← IPO workflow protocol (capital markets)
```

---

## Repository Structure

```
legalant/
  legalant/                       ← plugin root
    .claude-plugin/
      plugin.json                 ← plugin manifest
    agents/                       ← 13 agent definitions
    commands/                     ← 13 slash commands
    skills/                       ← 4 bundled skills
      contract-basics/SKILL.md
      word-choice/SKILL.md
      universal-standards/SKILL.md
      indian-law-defaults/SKILL.md
  .claude-plugin/
    marketplace.json              ← marketplace manifest
  rules/                          ← install manually
  install.sh                      ← rules installer (macOS/Linux/Git Bash/WSL)
  install-legalant.sh             ← one-line installer (macOS/Linux/Git Bash/WSL)
  legalant-build-execution-guide.md
  README.md
  CONTRIBUTING.md
  LICENSE
```

---

## HITL Gates

Every agent has at least one human-in-the-loop gate. Type `APPROVED` to continue or `REVISE: [instructions]` to send it back. Silence is never treated as approval.

Some gates are absolute stops with no bypass: court filings, SEBI submissions, and final execution packages. Filing with a court can't be undone, and the system is built to reflect that.

---

## Data Sources

LegalAnt runs without paid API accounts from day one. Case law comes from indiankanoon.org via web search. MCA data uses HITL-assisted portal lookups. RBI and SEBI data comes from the MCP scrapers in Module 0 of the build guide.

Two paid integrations slot in when you're ready. The Indian Kanoon API adds structured judgment analysis and bulk search. The Finanvo MCA V3 API automates CIN and DIN lookups. Both drop in as `.env` additions with no agent changes required.

---

## Disclaimer

_LegalAnt assists qualified advocates and legal professionals. It does not provide legal advice and cannot substitute for professional legal judgment. Every agent output carries a mandatory disclaimer and must be reviewed by a qualified advocate before reliance or external communication._
