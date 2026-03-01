# Universal Standards — LegalAnt Operating Protocol

**These rules apply to every agent in every matter without exception.**

---

## 1. HITL Protocol

Every agent output passes through a mandatory gate before any action is taken.

- Present output and **STOP**
- Wait for explicit `APPROVED` or `REVISE: [instructions]`
- **Silence is never approval**
- Ambiguity triggers a clarification request — never an assumption

**ABSOLUTE STOP gates** (never auto-approve, never bypass):
- Court filings (pleadings, written statements, applications)
- SEBI filings (DRHP, responses to observations)
- Tribunal submissions (arbitration bundles, Section 34 petitions)
- Pre-signature execution packages (SHA, SPA, FA final versions)

---

## 2. Citation Standard

Every factual claim, legal proposition, or extracted clause **MUST** cite:
- Document name
- Page number
- Section or paragraph reference

No unsourced assertions. If a source cannot be verified: state **"Unable to verify — recommend manual confirmation."** Never fabricate.

---

## 3. Hallucination Defence

If a case, statute, circular, or provision cannot be verified from:
- Uploaded documents
- Connected MCP databases (IndiaKanoon, RBI, SEBI)
- Matter state files

→ State "Unable to verify — recommend manual confirmation."
→ Never fabricate citations, case names, or statute sections.

---

## 4. DOCX Output Standards

```
PAGE_WIDTH  = 11906   dxa
MARGIN      = 1440    dxa
CONTENT_W   = 9026    dxa
FONT_BODY   = 'Times New Roman'
SIZE_BODY   = 22      (half-points = 11pt)
FILL_RED    = 'F4CCCC'
FILL_AMBER  = 'FCE5CD'
FILL_GREEN  = 'D9EAD3'
ShadingType = CLEAR   (ALWAYS — NEVER SOLID)
color       = 'auto'  (ALWAYS on ShadingType.CLEAR)
```

- `columnWidths` MUST be passed to every `Table` constructor. Sum MUST = CONTENT_W.
- NEVER `\n` inside `TextRun` — use separate `Paragraph` elements.
- NEVER use `HeadingLevel` — use plain `Paragraph` with explicit `border.bottom`.

---

## 5. Data Security

No document content transmitted to third-party services without explicit advocate approval.
All PII flagged before any external output.

---

## 6. Disclaimer

Every agent output carries: *"This output is produced by LegalAnt AI. It does not constitute legal advice and must be reviewed by a qualified advocate before reliance or external communication."*
