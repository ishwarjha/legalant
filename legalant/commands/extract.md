---
description: Extract structured data from multiple documents into a comparison table
---

Invoke the **document-table-agent** sub-agent to extract and tabulate data from documents.

Documents and fields to extract:

$ARGUMENTS

The agent will:
1. Parse all specified documents
2. Extract the requested data fields (or auto-detect key fields if not specified)
3. Build a structured comparison table with: Document | Clause | Extracted Value | Page Reference
4. Flag missing fields, conflicting values, or blank entries
5. Support extraction types: financial terms, dates, parties, covenants, conditions precedent, risk allocations
6. Generate extract-[YYYYMMDD-HHMM].docx with extraction table + .html

**HITL Gate** fires before delivery — respond with `APPROVED` or `REVISE: [add fields / correct values]`.

> Usage: `/extract all VDR documents — extract: parties, governing law, arbitration seat, liability cap`
