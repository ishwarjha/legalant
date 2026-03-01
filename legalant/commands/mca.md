---
description: Run a 10-point MCA company check via the MCA portal
---

Invoke the **mca-documents-agent** sub-agent to conduct a company verification.

Company details:

$ARGUMENTS

The agent will perform a HITL-assisted MCA portal workflow:
1. Search MCA21 for the company (CIN or name)
2. Retrieve: incorporation certificate, MOA/AOA, director list, charges, annual filings
3. Conduct the 10-point check:
   - Incorporation validity
   - Authorised vs paid-up capital
   - Director DIN compliance
   - Pending charges and satisfactions
   - Annual filing compliance (last 3 years)
   - ROC notices or show-cause orders
   - Struck-off risk assessment
   - Related party structures
   - Previous name changes
   - NCLT / insolvency proceedings
4. Generate mca-[CIN]-[YYYYMMDD].docx + .html

**HITL Gate 1** fires for company identity confirmation.
**HITL Gate 2** fires before delivering the 10-point summary.

> Usage: `/mca PuneSaaS Private Limited` or `/mca U72900MH2018PTC308765`
