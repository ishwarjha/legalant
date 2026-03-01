---
description: Build a timeline of events from uploaded documents
---

Invoke the **chronology-builder-agent** sub-agent to extract and build a chronological timeline.

Documents or context:

$ARGUMENTS

The agent will:
1. Parse all specified documents for dated events (explicit and implied dates)
2. Extract: agreements signed, notices served, deadlines triggered, breaches alleged, payments made
3. Order events chronologically with source citations (document + page + clause)
4. Flag ambiguous dates or sequence conflicts
5. Identify limitation period implications (Limitation Act 1963)
6. Generate chronology-[YYYYMMDD-HHMM].docx with timeline table + .html

**HITL Gate** fires before delivering the timeline — respond with `APPROVED` or `REVISE: [add/remove events]`.

> Usage: `/chronology all documents in vdr/` or `/chronology SHA_v1.txt labour_notice.pdf`
