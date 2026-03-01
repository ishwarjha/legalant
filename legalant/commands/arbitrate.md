---
description: Prepare arbitration strategy, bundle, and timeline under A&C Act 1996
---

Invoke the **arbitration-orchestrator** sub-agent for arbitration proceedings.

Dispute details:

$ARGUMENTS

The agent will:
1. **Section 29A Timeline** (calculated on every intake):
   - 12-month award deadline from constitution of tribunal
   - 18-month outer limit (without court extension)
   - Flag if within 90 days of deadline
2. Identify institutional rules:
   - MCIA / ICC / SIAC / LCIA / Ad hoc (Arbitration & Conciliation Act 1996)
3. Legal research on applicable law (legal-research-agent)
4. Chronology of dispute events (chronology-builder-agent)
5. Document extraction and bundle preparation (document-table-agent)
6. Translation of non-English documents (translation-agent)
7. Cross-examination question matrix for witnesses
8. Award analysis — Section 34 grounds for challenge

Generates arbitration-[YYYYMMDD-HHMM].docx + .html
Writes Section 29A deadline to calendar (if calendar MCP is available)

**HITL Gate 1** — arbitration strategy approval
**HITL Gate 2** — bundle submission (**ABSOLUTE STOP**)
**HITL Gate 3** — Section 34 filing (**ABSOLUTE STOP**)

> Usage: `/arbitrate SHA dispute — liability cap clause, MCIA Mumbai, 2 arbitrators already appointed`
