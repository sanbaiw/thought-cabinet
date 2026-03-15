---
"thought-cabinet": minor
---

### New features
- Add `init-agent-memory` skill for bootstrapping agent memory on new projects
- Add `writing-skill` for creating and managing skills with best practices
- Add `navigate-thoughts` skill for resolving and navigating thought documents
- Rename `agent init` to `skill install` and add `skill update` command
- Make `skill install` non-interactive, installing all assets by default
- Consolidate config directory to `~/.thought-cabinet/` with auto-migration
- Auto-refresh symlinks after config directory migration
- Resolve agent assets from config dir with auto-bootstrap

### Fixes
- Tighten TDD skip criteria in implementing-plan and TDD skills

### Refactoring
- Simplify and generalize research patterns in writing-skill
- Remove numbered headings and redundant sections in init-agent-memory
