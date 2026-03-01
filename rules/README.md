# LegalAnt Rules

This directory contains project-level rules that Claude loads automatically when working in a LegalAnt project.

## Files

| File | Purpose |
|---|---|
| _(populated by install.sh)_ | Rules are installed from `legalant/` plugin package |

## How Rules Work in Claude Code

Rules files (`.md`) placed in `.claude/rules/` are automatically loaded into Claude's context at the start of every session. They work like persistent system-level instructions.

LegalAnt ships four rule categories (installed via `install.sh`):

1. **indian-law-defaults** — Governing law, jurisdiction hierarchy, limitation periods, statutory defaults
2. **docx-standards** — DOCX generation constants: PAGE_WIDTH=11906, CONTENT_W=9026, ShadingType.CLEAR rules
3. **hitl-protocol** — Human-in-the-loop gate behaviour: silence ≠ approval, ABSOLUTE STOP gates
4. **contract-basics** — CONTRACT mnemonic checklist applied to every document review

## Manual Installation

If `install.sh` has not been run, copy rules manually:

```bash
cp legalant/skills/indian-law-defaults/SKILL.md .claude/rules/indian-law-defaults.md
cp legalant/skills/universal-standards/SKILL.md .claude/rules/universal-standards.md
cp legalant/skills/contract-basics/SKILL.md     .claude/rules/contract-basics.md
cp legalant/skills/word-choice/SKILL.md         .claude/rules/word-choice.md
```
