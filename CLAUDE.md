# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thought Cabinet (`thc`) is a CLI tool for managing developer thoughts and notes across multiple repositories. It synchronizes thoughts via a dedicated git repository while keeping them separate from code repositories.

## Build & Development Commands

```bash
npm run build        # Build with tsup (outputs to dist/)
npm run dev          # Build and run locally
npm run lint         # Run ESLint
npm run lint -- --fix  # Fix lint issues
npm run test         # Run vitest tests
npm run check        # Full check: format, lint, test, build
```

Run the CLI locally after building:
```bash
./dist/index.js <command>
# or
node dist/index.js <command>
```

## Architecture

### CLI Structure (Commander.js)

Entry point: `src/index.ts` - Registers three command groups:
- `thoughtsCommand` - Core thoughts management (init, sync, status, config, destroy, profile/*)
- `claudeCommand` - Claude Code configuration management
- `metadataCommand` - Repository metadata utilities

### Key Directories

- `src/commands/thoughts/` - Thoughts subcommands and utilities
- `src/commands/thoughts/utils/` - Shared utilities (config, paths, symlinks, repository)
- `src/templates/` - Template generators for gitignore, git hooks, readme, CLAUDE.md
- `src/config.ts` - Configuration loading/saving (`~/.config/thought-cabinet/config.json`)

### Configuration

Config file location: `~/.config/thought-cabinet/config.json` (XDG_CONFIG_HOME respected)

Key config structure:
```typescript
type ConfigFile = {
  thoughts?: {
    thoughtsRepo: string      // Path to thoughts git repo
    reposDir: string          // Directory for repo-specific thoughts
    globalDir: string         // Directory for cross-repo thoughts
    user: string              // Username for personal directories
    repoMappings: Record<string, string | RepoMappingObject>
    profiles?: Record<string, ProfileConfig>
  }
}
```

### Thoughts Directory Structure

When initialized in a repo, creates `thoughts/` with symlinks:
- `{user}/` → Personal repo-specific notes
- `shared/` → Team-shared repo-specific notes
- `global/` → Cross-repository thoughts (symlinked)
- `searchable/` → Hard links for search tools

## TypeScript Configuration

- ESM modules (`"type": "module"`)
- Target: ES2020
- Build tool: tsup
- Import extensions: `.js` required for local imports
