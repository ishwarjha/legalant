---
description: Compare two versions of a contract and produce a redline analysis
---

Invoke the **redline-analysis-agent** sub-agent to compare contract versions.

Provide version details:

$ARGUMENTS

The agent supports two modes:
- **Mode A** — Automated redline: provide v1 path and v2 path
- **Mode B** — Targeted clause analysis: provide clause reference and both versions

The agent will:
1. Parse both versions and identify every change
2. Classify each change: Typographical / Substantive / Deal-Breaker
3. Flag modal verb shifts (SHALL → WILL etc.) as automatic Substantive changes
4. Assess commercial impact per change
5. Generate redline-[YYYYMMDD-HHMM].docx with tracked changes table + .html

**HITL Gate** fires before output — respond with `APPROVED` or `REVISE: [focus areas]`.

> Usage: `/redline SHA_v1.txt SHA_v2_counterparty.txt` or `/redline Clause 8.2 — SHALL changed to WILL`
