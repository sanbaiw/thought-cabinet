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

- `thoughtsCommand` - Core thoughts management (init, sync, status, config, destroy, profile)
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
    thoughtsRepo: string // Path to thoughts git repo
    reposDir: string // Directory for repo-specific thoughts
    globalDir: string // Directory for cross-repo thoughts
    user: string // Username for personal directories
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

## Hook System

### Architecture

- Hook types: `src/hooks/types.ts`
- Hook loader: `src/hooks/loader.ts`
- Hook executor: `src/hooks/executor.ts`
- Configuration: `.thought-cabinet/hooks.json` at repo root

### Hook Events

- **Worktree**: PreWorktreeAdd, PostWorktreeAdd, PreWorktreeMerge, PostWorktreeMerge, PreWorktreeRemove, PostWorktreeRemove
- **Thoughts**: PostThoughtsInit, PostThoughtsDestroy, PostThoughtsSync

### Integration Points

- `src/commands/worktree.ts` - Worktree hooks
- `src/commands/thoughts/init.ts` - Init hooks
- `src/commands/thoughts/destroy.ts` - Destroy hooks
- `src/commands/thoughts/sync.ts` - Sync hooks

### Testing Hooks

1. Create `.thought-cabinet/hooks.json` with test hook
2. Run command that triggers hook
3. Verify hook execution in output
4. Check environment variables passed correctly

## Keeping Docs in Sync with CLI Changes

When CLI commands change (new flags, renamed options, removed features), these files must be updated:

### Shell Completion (`src/completion/handler.ts`)

- `OPTIONS` dict: maps command keys (e.g. `'agent init'`) to their CLI flags
- `DYNAMIC_OPTIONS` dict: maps flags that accept dynamic values to provider functions (e.g. `'--target': getAgentNames`)
- `DYNAMIC_ARGS` dict: maps commands that accept positional dynamic args to providers

### Shell Completion Providers (`src/completion/providers.ts`)

- Provider functions return string arrays for dynamic completion values
- Must stay in sync with the source of truth (e.g. `getAgentNames()` must match agent types in `src/commands/agent/registry.ts`)

### README (`README.md`)

- "Installing Agent Configuration" section: describes what `thc agent init` installs and its options
- "CLI Commands > Agent Configuration" section: quick-reference for `agent init` flags
- Keep both sections consistent with the actual Commander.js option definitions in `src/commands/agent.ts`

### General rule

The source of truth for CLI options is the Commander.js command definition (e.g. `src/commands/agent.ts`). Completion and README are downstream consumers that must mirror it.

## TypeScript Configuration

- ESM modules (`"type": "module"`)
- Target: ES2020
- Build tool: tsup
- Import extensions: `.js` required for local imports
