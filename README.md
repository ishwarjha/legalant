# LegalAnt 🐜⚖️

> **18-agent Indian legal AI system built on Claude Code subagents.**
> For in-house counsel, transactions, litigation, real estate, arbitration, banking & finance, and capital markets.

[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://github.com/stayonbus/legalant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Agents: 18](https://img.shields.io/badge/Agents-18-green)](legalant/agents/)

LegalAnt automates high-value repetitive legal work for Indian law practices — contract review, due diligence, regulatory research, chronology building, negotiation tracking, and more — with a mandatory human-in-the-loop (HITL) gate that keeps the responsible advocate in control of every material decision.

This project will be a helpful guide:

- To build a single entry point agent via lexis. Most agent systems expose every agent to the user. We thought one intake agent that routes internally is the fix.
- The shared skills pattern solves the duplication problem that kills multi-agent systems at scale. When you have 18 agents and update a rule in one prompt, the other 17 are still running because skills are loaded at runtime to fix this.
- The Human In The Loop (HITL) gates as first-class architecture. Considering the legal system complications, its absolute stops for irreversible actions as the most honest implementation of "human oversight" in AI systems.
- The pattern table at the bottom is designed to be a quick-reference for every agent.

---

## 18-Agent Architecture

Each agent is a Claude Code subagent with a dedicated system prompt, a fixed set of tools, and a mandatory HITL output gate. Agents do not communicate directly with clients — all outputs are routed through the responsible advocate.

| #   | Agent                   | Role                                                                                 | Primary Output Schema   |
| --- | ----------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| 1   | **Matter Intake**       | Opens a new matter from a client brief; populates matter.json                        | `matter.json`           |
| 2   | **Document Indexer**    | Classifies and indexes every uploaded document                                       | `index.json`            |
| 3   | **OCR / Extractor**     | Extracts text and structured data from PDFs (text-native + scanned)                  | `extraction-table.json` |
| 4   | **Chronology Builder**  | Constructs a timeline of events sourced from indexed documents                       | `chronology.json`       |
| 5   | **MCA Lookup**          | Queries MCA21 for company/LLP registration, directors, charges, compliance           | `mca-results.json`      |
| 6   | **RBI Researcher**      | Fetches and summarises RBI circulars, master directions, FEMA notifications          | `research-memo.json`    |
| 7   | **SEBI Researcher**     | Fetches and summarises SEBI circulars, regulations, enforcement orders               | `research-memo.json`    |
| 8   | **Legal Researcher**    | Deep statutory and case-law research; produces structured memo with citations        | `research-memo.json`    |
| 9   | **Contract Reviewer**   | Applies CONTRACT checklist; produces issues table with severity ratings              | `extraction-table.json` |
| 10  | **Contract Drafter**    | Drafts agreements from term sheets; applies word-choice and modal-verb rules         | _(document output)_     |
| 11  | **DD Analyst**          | Runs legal due diligence; maintains red-flag register for M&A and investment matters | `dd-register.json`      |
| 12  | **Negotiation Tracker** | Tracks clause-by-clause positions, fallbacks, concession costs across redraft cycles | `negotiation.json`      |
| 13  | **Compliance Checker**  | Maps contractual and corporate obligations to Indian regulatory requirements         | `research-memo.json`    |
| 14  | **Litigation Support**  | Organises pleadings, evidence summaries, hearing chronologies                        | `chronology.json`       |
| 15  | **Corporate Secretary** | Drafts board resolutions, statutory notices, annual filing checklists                | _(document output)_     |
| 16  | **Employment Analyst**  | Reviews employment contracts, POSH policies, severance terms                         | `extraction-table.json` |
| 17  | **IP Analyst**          | Reviews IP assignments, licensing agreements, freedom-to-operate questions           | `extraction-table.json` |
| 18  | **Orchestrator**        | Coordinates multi-agent workflows end-to-end; manages HITL log and matter lifecycle  | `hitl-log.json`         |

---

## Folder Structure

```
legalant/
│
├── matters/                        ← One sub-folder per matter (e.g. LA-2024-001/)
│   └── LA-YYYY-NNN/
│       ├── matter.json             ← Matter metadata
│       ├── index.json              ← Document index for this matter
│       ├── hitl-log.json           ← Running HITL decision log
│       ├── documents/              ← Raw uploaded documents (PDFs, Word, etc.)
│       └── outputs/                ← Agent-generated JSON output files
│
├── schemas/                        ← JSON templates — one per structured output type
│   ├── matter.json
│   ├── index.json
│   ├── negotiation.json
│   ├── mca-results.json
│   ├── chronology.json
│   ├── extraction-table.json
│   ├── research-memo.json
│   ├── dd-register.json
│   └── hitl-log.json
│
├── skills/                         ← Shared skill files loaded by agents
│   ├── contract-basics-skill.md    ← CONTRACT mnemonic — 8-point review checklist
│   ├── word-choice-skill.md        ← Modal verb taxonomy for contract drafting
│   └── universal-standards.md      ← HITL protocol, citation rules, hallucination defence
│
├── mcp-servers/                    ← Node.js MCP servers (stdio transport)
│   ├── rbi-scraper/                ← Tools: search_rbi, fetch_rbi_document
│   ├── sebi-scraper/               ← Tools: search_sebi, search_scores, fetch_sebi_document
│   └── pdf-ocr-processor/          ← Tools: detect_pdf_type, extract_text
│
├── .claude/
│   ├── agents/                     ← Agent .md system-prompt files (added per module)
│   └── skills/                     ← Claude Code skill references (mirror of /skills/)
│
├── .env.example                    ← Credential template — copy to .env, never commit .env
└── README.md                       ← This file
```

---

## MCP Servers

### Phase 1 — Active at Launch

| Server                | Folder                           | Tools                                                 | Data Source                               |
| --------------------- | -------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| **rbi-scraper**       | `mcp-servers/rbi-scraper/`       | `search_rbi`, `fetch_rbi_document`                    | rbi.org.in (public)                       |
| **sebi-scraper**      | `mcp-servers/sebi-scraper/`      | `search_sebi`, `search_scores`, `fetch_sebi_document` | sebi.gov.in, scores.sebi.gov.in (public)  |
| **pdf-ocr-processor** | `mcp-servers/pdf-ocr-processor/` | `detect_pdf_type`, `extract_text`                     | Local files via pdfjs-dist + tesseract.js |

### Phase 2 — Added When Activated

| Server            | Trigger                                   | Tools (planned)                                                 | Data Source                     |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| **mca-api**       | When Finanvo API key is provisioned       | `search_company`, `get_directors`, `get_charges`, `get_filings` | Finanvo MCA API (authenticated) |
| **kanoon-search** | When IndiaKanoon API token is provisioned | `search_cases`, `fetch_judgment`                                | IndiaKanoon API (authenticated) |

---

## Setup Instructions

## One-Line Install

```bash
# Install core rules only
curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash

# Install everything
curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- all

# Install specific practice areas
curl -fsSL https://raw.githubusercontent.com/ishwarjha/legalant/main/install-legalant.sh | bash -s -- inhouse transactions
```

### Prerequisites

```bash
# Node.js 18 or later
node --version

# canvas native module (for pdf-ocr-processor OCR path — macOS)
xcode-select --install
```

### Step 1 — Configure environment

```bash
cp .env.example .env
# Open .env and fill in:
#   GOOGLE_CREDENTIALS_PATH  — path to your Google service account JSON
#   N8N_WEBHOOK_URL          — your n8n webhook URL
```

### Step 2 — Install MCP server dependencies

```bash
cd mcp-servers/rbi-scraper && npm install
cd ../sebi-scraper && npm install
cd ../pdf-ocr-processor && npm install
```

### Step 3 — Register MCP servers with Claude Code

Add to `.claude/settings.json` (create if it does not exist):

```json
{
  "mcpServers": {
    "rbi-scraper": {
      "command": "node",
      "args": ["mcp-servers/rbi-scraper/index.js"]
    },
    "sebi-scraper": {
      "command": "node",
      "args": ["mcp-servers/sebi-scraper/index.js"]
    },
    "pdf-ocr-processor": {
      "command": "node",
      "args": ["mcp-servers/pdf-ocr-processor/index.js"],
      "env": {
        "MATTERS_BASE_PATH": "/absolute/path/to/legalant/matters"
      }
    }
  }
}
```

### Step 4 — Create your first matter folder

```bash
mkdir -p matters/LA-2024-001/documents
mkdir -p matters/LA-2024-001/outputs
cp schemas/matter.json matters/LA-2024-001/matter.json
cp schemas/index.json matters/LA-2024-001/index.json
cp schemas/hitl-log.json matters/LA-2024-001/hitl-log.json
```

---

## Phase 1 vs Phase 2 — Data Sources

| Data Type                         | Phase 1 Source                        | Phase 2 Source                      | Notes                                 |
| --------------------------------- | ------------------------------------- | ----------------------------------- | ------------------------------------- |
| RBI circulars & master directions | rbi-scraper (public scrape)           | rbi-scraper (unchanged)             | RBI has no authenticated API          |
| SEBI circulars & regulations      | sebi-scraper (public scrape)          | sebi-scraper (unchanged)            | SEBI has no authenticated API         |
| SEBI enforcement / SCORES         | sebi-scraper (public scrape)          | sebi-scraper (unchanged)            |                                       |
| PDF text extraction               | pdf-ocr-processor (local, pdfjs-dist) | pdf-ocr-processor (unchanged)       |                                       |
| MCA company data                  | Manual upload or public MCA21 portal  | mca-api via Finanvo (authenticated) | Finanvo provides structured MCA data  |
| Case law & judgments              | Manual upload of downloaded PDFs      | kanoon-search via IndiaKanoon API   | IndiaKanoon API required for search   |
| Google Workspace (Docs, Drive)    | Google service account credentials    | Google service account (unchanged)  | GOOGLE_CREDENTIALS_PATH in .env       |
| n8n workflow triggers             | N8N_WEBHOOK_URL in .env               | N8N_WEBHOOK_URL (unchanged)         | Used for notifications and automation |

---

## HITL Protocol

Every agent output passes through a mandatory gate before any action is taken:

1. Agent produces output and sets `hitl_required: true/false`
2. If `true` — agent writes to `hitl-log.json` and **stops**
3. Responsible advocate reviews the flagged output
4. Advocate responds with `APPROVED` or `REVISE: [instructions]`
5. Silence is **never** treated as approval
6. Agents **never** fabricate citations — unverifiable sources are flagged as `"Unable to verify — recommend manual confirmation"`

---

## Disclaimer

_LegalAnt assists qualified advocates and legal professionals. It does not provide legal advice and cannot substitute for professional legal judgment. Every agent output carries a mandatory disclaimer and must be reviewed by a qualified advocate before reliance or external communication._
