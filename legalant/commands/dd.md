---
description: Run a 12-step legal due diligence across 4 parallel streams
---

Invoke the **due-diligence-orchestrator** sub-agent for legal due diligence.

Matter context and VDR location:

$ARGUMENTS

The agent runs a 12-step DD workflow:
1. Parse DD brief and classify documents (file-library-agent)
2. MCA company verification (mca-documents-agent)
3. 4 parallel streams:
   - **Legal Stream** — title, contracts, litigation, IP
   - **Financial/Compliance Stream** — financial statements, tax, regulatory filings
   - **Regulatory Stream** — FEMA, SEBI, sector-specific approvals
   - **Operational Stream** — employment, property, environmental
4. Document review per stream (document-review-agent)
5. Data extraction and comparison (document-table-agent)
6. Legal research for flagged issues (legal-research-agent)
7. Aggregate findings across streams
8. Red Flag Register — RAG rated (Red / Amber / Green)
9. Change of Control Map
10. Regulatory Clearance Map
11. Conditions Precedent recommendations
12. DD Report with executive summary

Writes `.legalant/dd-register.json` on approval.
Generates dd-report-[YYYYMMDD-HHMM].docx + .html

**HITL Gate** — DD report approval

> Usage: `/dd 40 VDR documents at documents/vdr/ — 74% acquisition of PuneSaaS, ₹50Cr`
