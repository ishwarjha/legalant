---
description: Map the regulatory perimeter for a transaction or business activity
---

Invoke the **advisory-orchestrator** sub-agent for regulatory perimeter mapping.

Advisory query or transaction details:

$ARGUMENTS

The agent will map the regulatory perimeter across 8 Indian regulators:
1. RBI (FEMA, banking, NBFCs)
2. SEBI (securities, capital markets, listed entities)
3. MCA (company law, ROC filings)
4. FEMA (cross-border transactions, ECB, FDI/ODI)
5. IRDAI (insurance)
6. DPDP Act 2023 (data protection, Section 16 cross-border)
7. GST/CBDT (tax implications)
8. CCI (competition, combinations)

Then apply Three Pillars quality check:
- Integrity to Transaction — does the advice match the deal?
- Commercial Reasonableness — is it practically achievable?
- Trust-Based Drafting — is the language clear and enforceable?

Generates advisory-note-[YYYYMMDD-HHMM].docx + .html

**HITL Gate 1** — scope approval
**HITL Gate 2** — advisory note approval (ABSOLUTE)

> Usage: `/advise Singapore entity acquiring 74% in Indian SaaS company — FEMA, SEBI, and competition law`
