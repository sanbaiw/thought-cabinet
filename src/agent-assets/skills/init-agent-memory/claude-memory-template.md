# AGENTS.md Template

Use this template to create the concise canonical memory document.

## 1) Project Overview

- Purpose: [What the project does and why it exists]
- Scope: [Core responsibilities and boundaries]
- Evidence: `path/to/file:line`

## 2) Tech Stack

- Languages/runtime: [TypeScript, Node.js, etc.]
- Frameworks/libraries: [Commander.js, Vitest, etc.]
- Tooling: [build/lint/test tools]
- Evidence: `path/to/file:line`

## 3) Key Directories

- `src/...`: [responsibility]
- `...`: [responsibility]
- Evidence per directory: `path/to/file:line`

## 4) Essential Build/Test Commands

- `...`: [what it does and when to use it]
- `...`: [what it does and when to use it]
- Evidence: `path/to/file:line`

## 5) Additional Documentation

- `docs/architectural-patterns.md`: Recurring design patterns and conventions
- Add only docs that provide specialized detail not suitable for AGENTS.md

## Constraints

- Keep full document under 150 lines
- Use file:line references instead of code snippets
- Keep guidance universally applicable for contributors and agents
- Treat `AGENTS.md` as canonical, then create `CLAUDE.md` as a symlink to `AGENTS.md`
