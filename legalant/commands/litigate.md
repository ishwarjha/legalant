---
description: Prepare pleadings, strategy, and evidence analysis for litigation
---

Invoke the **litigation-orchestrator** sub-agent for litigation support.

Matter details:

$ARGUMENTS

The agent will:
1. **Limitation Period Check** (mandatory on every intake — Limitation Act 1963)
   - Identify the applicable limitation article
   - Calculate expiry date from cause of action
   - Flag if limitation is at risk (< 30 days)
2. Identify court and applicable rules:
   - Supreme Court / High Court / District Court / NCLT / SAT
   - Apply court-specific formatting requirements
3. Select pleading type:
   - Plaint / Written Statement / Counter-Claim / Interlocutory Application / Writ
4. Legal research on applicable law (legal-research-agent)
5. Build evidence chronology (chronology-builder-agent)
6. Draft the pleading with mandatory disclaimer
7. Analyse opposing arguments and suggest responses

Generates litigation-[YYYYMMDD-HHMM].docx + .html

**HITL Gate 1** — litigation plan approval
**HITL Gate 2** — draft pleading approval (**ABSOLUTE STOP** — never auto-approve)
**HITL Gate 3** — opposing analysis approval

> Usage: `/litigate labour dispute — ₹8.5L claim, Pune labour court, 3 witnesses`
