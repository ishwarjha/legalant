---
description: Run legal research on a statute, case, or regulatory question
---

Invoke the **legal-research-agent** sub-agent to conduct legal research.

Research query:

$ARGUMENTS

The agent will:
1. Parse the query — statute / case law / regulatory / comparative
2. Search IndiaKanoon, RBI, SEBI, MCA, and uploaded precedents
3. Identify leading cases, applicable statutes, and relevant circulars
4. Produce a structured research memo with citations (document + page + section)
5. Flag any "Unable to verify" items rather than fabricating citations
6. Generate research-[YYYYMMDD-HHMM].docx + .html

**HITL Gate** fires before delivering the memo — respond with `APPROVED` or `REVISE: [scope changes]`.

> Usage: `/research Section 29A Arbitration Act 1996 — timeline for 74% acquisition dispute`
