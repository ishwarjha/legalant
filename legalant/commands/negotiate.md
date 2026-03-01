---
description: Track negotiation positions and generate the next redline round
---

Invoke the **transactions-orchestrator** sub-agent for negotiation tracking and redlining.

Negotiation context or new instructions:

$ARGUMENTS

The agent will:
1. Load current negotiation state from `.legalant/negotiation.json` (if matter is open)
2. Parse new instructions — counterparty positions, new fallbacks, concessions authorised
3. Update position tracking: Deal-Breaker / Open / Agreed per clause
4. Generate the next redline draft with Three Pillars quality check:
   - Integrity to Transaction
   - Commercial Reasonableness
   - Trust-Based Drafting
5. Save updated negotiation.json
6. Generate negotiation-round[N]-[YYYYMMDD-HHMM].docx + .html

**HITL Gate 1** — deal structure approval
**HITL Gate 2** — redline output approval (before sending to counterparty)

> Usage: `/negotiate counterparty accepted liability cap at ₹40Cr but wants warranty period extended to 36 months`
