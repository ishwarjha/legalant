---
description: Run an in-house legal workflow — contracts, board matters, compliance
---

Invoke the **in-house-orchestrator** sub-agent for in-house legal work.

Task or document details:

$ARGUMENTS

The agent handles in-house legal workflows including:
- Contract drafting and review (with board approval tracking)
- Board resolution drafting
- Compliance calendar updates
- Internal legal opinions
- Policy drafting (POSH, data protection, vendor management)
- NDA review and approval workflow
- Employment contract review

Produces two-layer output:
1. **Legal Layer** — detailed analysis with citations
2. **Business Layer** — executive summary in plain language

Generates inhouse-[matter-type]-[YYYYMMDD-HHMM].docx + .html

**HITL Gate 1** — task scope and approach
**HITL Gate 2** — final output approval

> Usage: `/inhouse draft NDA with Indian counterparty — 2-year term, mutual, IT sector`
> Usage: `/inhouse board resolution for 74% acquisition approval — Companies Act 2013`
