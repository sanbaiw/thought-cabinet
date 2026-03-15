# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thought Cabinet (`thc`) is a CLI tool for structured AI coding workflows with filesystem-based memory and context management. It synchronizes thoughts via a dedicated git repository, manages AI agent configurations (skills, agents), and provides git worktree workflows bound to tmux sessions.

## Build & Development Commands

```bash
pnpm run build        # Build with tsup (outputs to dist/)
pnpm run lint         # Run ESLint
pnpm run lint -- --fix  # Fix lint issues
pnpm run test         # Run vitest tests
pnpm run check        # Full check: format:check, lint, test, build
pnpm run format       # Format with prettier
pnpm run format:check # Check formatting
pnpm run clean        # Remove dist/
```

Run the CLI locally after building:

```bash
./dist/index.js <command>
# or
node dist/index.js <command>
```

## Architecture

### CLI Structure (Commander.js)

Entry point: `src/index.ts` - Registers six command groups:

- `thoughtsCommand` - Core thoughts management (init, sync, status, config, destroy, prune, profile)
- `skillCommand` - Skill and agent asset management (install, update)
- `metadataCommand` - Repository metadata utilities
- `worktreeCommand` - Git worktree management bound to tmux sessions (add, list, merge, remove)
- `hooksCommand` - Hook configuration management (init)
- `completionCommand` - Shell completion (install, uninstall)

### Key Directories

- `src/commands/thoughts/` - Thoughts subcommands and utilities
- `src/commands/thoughts/utils/` - Shared utilities (config, paths, symlinks, repository, cleanup, git-url)
- `src/commands/thoughts/profile/` - Profile subcommands (create, list, show, delete)
- `src/commands/agent/` - Agent init infrastructure (registry, discovery, installer, types, constants)
- `src/commands/worktree/` - Worktree subcommands (add, list, merge, remove, utils)
- `src/commands/hooks/` - Hooks subcommands (init)
- `src/agent-assets/` - Bundled agent and skill assets
- `src/agent-assets/agents/` - Agent markdown configs (codebase-analyzer, codebase-locator, codebase-pattern-finder, code-simplifier, thoughts-analyzer, thoughts-locator, web-search-researcher)
- `src/agent-assets/skills/` - Skill packages (commit, creating-plan, implementing-plan, iterating-plan, research-codebase, validating-plan)
- `src/completion/` - Shell completion (handler, providers, installer)
- `src/hooks/` - Hook system (types, loader, executor)
- `src/templates/` - Template generators (gitignore, git hooks, readme, claudeMd, agentMd)

### Utility Modules

- `src/config.ts` - Configuration loading/saving via `ConfigResolver` class
- `src/git.ts` - Git operations (worktree management, status, branches)
- `src/tmux.ts` - Tmux session management
- `src/agent-config.ts` - Agent config handling for worktrees (copying symlinks between worktrees)

### Configuration

Config file location: `~/.thought-cabinet/config.json` (falls back to `~/.config/thought-cabinet/config.json` for existing installs; `XDG_CONFIG_HOME` respected)

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
    commitRepoPrefix?: boolean
  }
}
```

### Thoughts Directory Structure

When initialized in a repo, creates `thoughts/` with symlinks:

- `{user}/` → Personal repo-specific notes
- `shared/` → Team-shared repo-specific notes
- `global/` → Cross-repository thoughts (symlinked)
- `searchable/` → Hard links for search tools

## Agent System

### Agent Registry (`src/commands/agent/registry.ts`)

Supported agents: `claude-code`, `codebuddy`, `cursor`, `codex`, `gemini-cli`, `cline`

Each agent defines: name, displayName, configDir (project-level), globalConfigDir (global-level), and detectInstalled function.

### Skill Install (`src/commands/agent/init.ts`)

Interactive CLI for installing agent assets (skills, agents) to an agent's config directory. Supports:

- **Scope**: `project` (repo-level) or `global` (user-level)
- **Mode**: `symlink` (canonical storage in `.thought-cabinet/`) or `copy`
- **Target**: `--target <agent>` flag to specify agent type

### Asset Discovery (`src/commands/agent/discovery.ts`)

Discovers skills and agent configs from `src/agent-assets/`. Skills have SKILL.md with YAML frontmatter (name, description). Agent configs are markdown files.

### Asset Installation (`src/commands/agent/installer.ts`)

`installAssetForAgent()` handles symlink-with-canonical-storage or copy mode. Includes path traversal protection and symlink fallback to copy.

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

- `src/commands/worktree/` - Worktree hooks (add, merge, remove)
- `src/commands/thoughts/init.ts` - Init hooks
- `src/commands/thoughts/destroy.ts` - Destroy hooks
- `src/commands/thoughts/sync.ts` - Sync hooks

### Testing Hooks

1. Create `.thought-cabinet/hooks.json` with test hook
2. Run command that triggers hook
3. Verify hook execution in output
4. Check environment variables passed correctly

## Worktree System

Manages git worktrees bound to tmux sessions (`src/commands/worktree/`):

- `add` - Create worktree + tmux session (options: --branch, --base, --path, --detached, --no-thoughts)
- `list` - List thc-managed worktrees and tmux sessions (option: --all)
- `merge` - Rebase onto target, ff-merge, cleanup (options: --into, --force, --keep-session, --keep-worktree, --keep-branch)
- `remove` - Remove worktree + cleanup resources (option: --force)

## Keeping Docs in Sync with CLI Changes

When CLI commands change (new flags, renamed options, removed features), these files must be updated:

### Shell Completion (`src/completion/handler.ts`)

- `OPTIONS` dict: maps command keys (e.g. `'skill install'`) to their CLI flags
- `DYNAMIC_OPTIONS` dict: maps flags that accept dynamic values to provider functions (e.g. `'--target': getAgentNames`)
- `DYNAMIC_ARGS` dict: maps commands that accept positional dynamic args to providers

### Shell Completion Providers (`src/completion/providers.ts`)

- Provider functions return string arrays for dynamic completion values
- Must stay in sync with the source of truth (e.g. `getAgentNames()` must match agent types in `src/commands/agent/registry.ts`)

### README (`README.md`)

- "Installing Agent Configuration" section: describes what `thc skill install` installs and its options
- "CLI Commands > Agent Configuration" section: quick-reference for `skill install` flags
- Keep both sections consistent with the actual Commander.js option definitions in `src/commands/agent.ts`

### General rule

The source of truth for CLI options is the Commander.js command definition (e.g. `src/commands/agent.ts`). Completion and README are downstream consumers that must mirror it.

## Testing

Test files are co-located with source or under `__tests__/`:

- `src/commands/agent/__tests__/` - discovery.test.ts, installer.test.ts, sanitize.test.ts
- `src/agent-config.test.ts`
- `src/git.test.ts`
- `src/tmux.test.ts`
- `src/commands/thoughts/utils/git-url.test.ts`

Test runner: vitest (`pnpm run test`)

## TypeScript Configuration

- ESM modules (`"type": "module"`)
- Target: ES2020
- Build tool: tsup
- Import extensions: `.js` required for local imports
