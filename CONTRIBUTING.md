# Contributing to LegalAnt

Thank you for considering a contribution to LegalAnt. This document describes the workflow and standards.

---

## Ground Rules

1. **Every agent is a `.md` file** stored under `legalant/agents/`. No Python, no JS, no compiled dependencies in the agent layer.
2. **Output MUST be DOCX + HTML.** See [DOCX Output Standards](#docx-output-standards) below.
3. **HITL gates are sacred.** Never remove or auto-approve an ABSOLUTE STOP gate.
4. **Indian law defaults apply unless overridden.** All agents default to Indian jurisdiction.
5. **ShadingType.CLEAR + color:'auto'.** Never use ShadingType.SOLID. Never set shading color to the fill hex value.

---

## Agent Development Workflow

### 1. Fork and branch

```bash
git clone https://github.com/appetals/legalant.git
cd legalant
git checkout -b feat/my-new-agent
```

### 2. Create your agent file

Place it in `legalant/agents/my-agent-name.md`. Follow the structure:

```markdown
---
name: My Agent Name
description: One-line description
model: claude-sonnet-4-5   # or claude-haiku-4-5 or claude-opus-4-5
tools: [Read, Write, Bash, WebFetch]
---

# My Agent Name

## Role
...

## Inputs
...

## HITL Gates
Gate 1 — [Description] → ABSOLUTE / Standard

## Output
- [filename]-[YYYYMMDD-HHMM].docx
- [filename]-[YYYYMMDD-HHMM].html

## DOCX Generation Pattern
1. npm init -y && npm install docx in outputs/
2. Write Node.js script → run → delete script + node_modules
3. Run python scripts/office/validate.py [path]
4. Write self-contained HTML artifact viewer
5. Print ONLY: ✅ [type] complete → Artifact path → Report path
```

### 3. Create a matching command file

Place it in `legalant/commands/my-command.md`:

```markdown
---
description: Short description of /my-command
---

Invoke the `my-agent-name` sub-agent with the following context:

$ARGUMENTS

The agent will [describe behavior].
```

### 4. Test end-to-end

```bash
# In your matter directory:
/my-command [sample input]
```

Verify:
- DOCX opens correctly in Microsoft Word
- HTML is self-contained (no external CDN)
- HITL gate fires and waits for approval
- State files written correctly to `.legalant/`

### 5. Submit PR

- PR title: `feat: add [agent-name]` or `fix: [issue]`
- Include sample output DOCX name (not the file — just the name) in PR description
- All HITL gates must be documented in the PR

---

## DOCX Output Standards

```
PAGE_WIDTH  = 11906   dxa
MARGIN      = 1440    dxa
CONTENT_W   = 9026    dxa  (must equal PAGE_WIDTH - 2*MARGIN)
FONT_BODY   = 'Times New Roman'
SIZE_BODY   = 22      half-points (= 11pt)
FILL_RED    = 'F4CCCC'
FILL_AMBER  = 'FCE5CD'
FILL_GREEN  = 'D9EAD3'
```

Critical rules:
- `ShadingType.CLEAR` ALWAYS. NEVER `ShadingType.SOLID`.
- `color: 'auto'` on every shading element. NEVER set color to the fill hex.
- `columnWidths: [w1, w2, ...]` MUST be passed to every `Table` constructor. Sum MUST equal `CONTENT_W`.
- NEVER `\n` inside `TextRun` — use separate `Paragraph` elements.
- NEVER use `HeadingLevel` — use plain `Paragraph` with explicit `border.bottom`.
- Numbered lists: prepend `"1.  "` as `TextRun`, not the numbering system (buggy in docx v9).

---

## Skill Development

Skills live in `legalant/skills/[skill-name]/SKILL.md`. Each SKILL.md is a concise reference document that agents load for context. Keep skills under 30 lines — they're loaded into agent context on every invocation.

---

## Code of Conduct

Be kind. Be accurate. Lawyers' work has real consequences.
