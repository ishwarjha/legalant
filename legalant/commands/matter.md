---
description: Open a new LegalAnt matter — routes through lexis master orchestrator
---

Invoke the **lexis** sub-agent to open a new matter.

Pass the following context to lexis:

$ARGUMENTS

Lexis will:
1. Parse the matter description — parties, transaction type, quantum, jurisdiction
2. Classify the matter (M&A / Litigation / Real Estate / Arbitration / Advisory / In-house)
3. Write `.legalant/matter.json` with matter_id (format: LA-YYYY-NNN)
4. Log Gate 1 HITL in `.legalant/hitl-log.json`
5. Route to the appropriate Layer 2 or Layer 3 orchestrator

**HITL Gate 1** fires after classification — respond with `APPROVED` or `REVISE: [corrections]`.

> If no arguments are provided, lexis will ask for the matter brief interactively.
