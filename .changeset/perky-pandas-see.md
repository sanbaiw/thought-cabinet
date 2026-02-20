---
"thought-cabinet": patch
---

Improve shell completion installation experience and documentation

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