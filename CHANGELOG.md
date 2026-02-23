# thought-cabinet

## 0.1.10

### Patch Changes

- dafe3f3: Migrate to ESLint v10 flat config format and resolve all npm security vulnerabilities (17 → 0)

## 0.1.9

### Patch Changes

- b367a47: Improve shell completion installation experience and documentation

  ### Features
  - **Enhanced shell completion installer**: Replace tabtab's internal inquirer prompts with @clack/prompts for consistent CLI UX. The installer now auto-detects your shell and provides helpful hints during setup.
  - **Postinstall hint**: Added a postinstall script that reminds users to run `thc completion install` after installation (note: npm may suppress this output during installations by design).

  ### Documentation
  - **Restructured README**: Moved advanced content (worktrees, full CLI reference) into dedicated docs files. The README now focuses on the core workflow of installing and using skills via `thc agent init`.
  - **Updated skill names**: All slash command names now match current source (e.g., `/researching-codebase` instead of `/research_codebase`).
  - **Improved docs packaging**: Documentation files are now included in the published package.

  ### Other Changes
  - **CLI option rename**: Changed `--agent` flag to `--target` in `thc agent init` command for clarity (and updated all related documentation).
  - **Node.js version management**: Added `.nvmrc` file to specify Node.js 24 as the project's version.
  - **Skill descriptions**: Updated for improved clarity and conciseness.

## 0.1.5

### Patch Changes

- 208fd1d: Fix `thc worktree add` to properly handle symlinked agent configs

  Previously, `copyAgentConfigDirs()` blindly copied agent config directories (`.claude/`, `.codebuddy/`) using `fs.cpSync()` with dereference, which broke relative symlinks pointing into `.thought-cabinet/` canonical storage since that directory wasn't copied to the new worktree.

  The fix replaces the naive copy with a symlink-aware implementation that:
  - Copies `.thought-cabinet/` canonical storage to the new worktree first
  - Recreates relative symlinks from agent config dirs to the worktree's local `.thought-cabinet/`
  - Preserves non-canonical symlinks (e.g., global-scope installs) as-is
  - Dynamically detects all agent config directories from the registry instead of hardcoding `.claude` and `.codebuddy`
