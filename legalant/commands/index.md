---
description: Index and classify documents in a VDR or matter folder
---

Invoke the **file-library-agent** sub-agent to index and classify documents.

Documents or folder to index:

$ARGUMENTS

The agent will:
1. Scan all documents in the specified path
2. Classify each into one of 24 categories:
   - Incorporation, Constitutional, Shareholders Agreement, Employment, IP, Real Property,
     Finance/Security, Regulatory, Litigation, Tax, Insurance, Government Contracts,
     Material Contracts, Leases, Technology, Environmental, Pension/Benefits, Permits,
     Board Minutes, MCA Filings, Audit Reports, Valuation, Due Diligence, Other
3. Extract metadata: parties, dates, governing law, expiry dates
4. Flag version control issues (multiple versions of same document)
5. Write `.legalant/index.json` with full document registry
6. Generate index-[YYYYMMDD-HHMM].docx + .html

**HITL Gate** fires after classification — respond with `APPROVED` or `REVISE: [reclassify / add documents]`.

> Usage: `/index documents/vdr/` or `/index path/to/40/documents`
