---
description: Translate a legal document from any language to English
---

Invoke the **translation-agent** sub-agent to translate a legal document.

Document or text to translate:

$ARGUMENTS

The agent will:
1. Detect the source language automatically
2. Translate to English with legal term preservation
3. Produce bilingual output (source + translation side by side)
4. Flag untranslatable terms or legal concepts with explanatory footnotes
5. Preserve all document structure (clauses, headings, paragraph numbering)
6. Generate translation-[YYYYMMDD-HHMM].docx + .html

**HITL Gate** fires before delivery — respond with `APPROVED` or `REVISE: [terminology corrections]`.

> Usage: `/translate documents/sale_deed_hindi.pdf` or `/translate [paste Marathi text here]`
