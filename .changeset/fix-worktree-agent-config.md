---
'thought-cabinet': patch
---

Fix `thc worktree add` to properly handle symlinked agent configs

Previously, `copyAgentConfigDirs()` blindly copied agent config directories (`.claude/`, `.codebuddy/`) using `fs.cpSync()` with dereference, which broke relative symlinks pointing into `.thought-cabinet/` canonical storage since that directory wasn't copied to the new worktree.

The fix replaces the naive copy with a symlink-aware implementation that:

- Copies `.thought-cabinet/` canonical storage to the new worktree first
- Recreates relative symlinks from agent config dirs to the worktree's local `.thought-cabinet/`
- Preserves non-canonical symlinks (e.g., global-scope installs) as-is
- Dynamically detects all agent config directories from the registry instead of hardcoding `.claude` and `.codebuddy`
