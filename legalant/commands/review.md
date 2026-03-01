---
description: Review a document using the document-review-agent
---

Invoke the **document-review-agent** sub-agent to review and analyse the specified document.

Document or context to review:

$ARGUMENTS

The agent will:
1. Read the document from the VDR or path specified
2. Apply the CONTRACT mnemonic checklist (8-point review)
3. Produce an issues table with severity ratings (High / Medium / Low)
4. Flag any DPDP Act 2023, FEMA, or SEBI compliance gaps
5. Generate review-[YYYYMMDD-HHMM].docx + .html

**HITL Gate** fires before finalising the review output.

> Usage: `/review path/to/document.pdf` or `/review SHA Clause 8.2 — liability cap`
