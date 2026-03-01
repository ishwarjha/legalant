---
description: Conduct real estate due diligence, title analysis, and transaction review
---

Invoke the **real-estate-orchestrator** sub-agent for real estate matters.

Property details:

$ARGUMENTS

The agent will:
1. **Jurisdiction Detection** — auto-detect state and applicable law:
   - Maharashtra (MOFA, RERA Act 2016, Maharashtra Stamp Act)
   - Karnataka (KAOA, RERA Act 2016, Karnataka Stamp Act)
   - Tamil Nadu / AP-Telangana / Delhi / Rajasthan
2. **Title Chain Analysis** — going back to root title
3. **Document Review**:
   - 7/12 extract (Maharashtra) / Khata certificate (Karnataka) / EC interpretation
   - Sale deed, GPA, development agreement review
   - Encumbrance certificate check
4. **MCA Charges** — auto-triggered if seller is a company (Section 77 Companies Act)
5. **RERA Verification** — project registration, completion certificate status
6. Flag: agricultural land restrictions, tribal land issues, disputed titles

Generates realestate-[YYYYMMDD-HHMM].docx + .html

**HITL Gate 1** — jurisdiction and scope confirmation
**HITL Gate 2** — title diligence report (**ABSOLUTE STOP**)

> Usage: `/realestate Commercial property, Pune, seller = company, purchase consideration ₹2Cr`
