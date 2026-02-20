# Worktrees

Thought Cabinet integrates git worktrees with tmux sessions to enable parallel development workflows. Each feature gets its own isolated worktree and terminal session, with thoughts automatically synced.

## Overview

A worktree workflow separates research/planning (on the main branch) from implementation (in an isolated worktree). Multiple worktrees can run simultaneously, each in its own tmux session.

## Workflow

### Phase 1: Research & Planning (Main Branch)

```bash
# In your main branch, start your AI agent
cd your-project
claude

# Research the codebase
> /researching-codebase
> How does the authentication system work?

# Create an implementation plan
> /creating-plan
> Add OAuth2 support based on the research

# Iterate until the plan is solid
> /iterating-plan thoughts/shared/plans/add-oauth.md
```

### Phase 2: Create Worktree

```bash
# Create isolated worktree with tmux session
thc worktree add add-oauth

# This creates:
# - New git worktree at ../<repo>__worktrees/add-oauth/
# - New git branch (add-oauth)
# - Dedicated tmux session (thc-add-oauth)
# - Thoughts initialized and synced in worktree
```

### Phase 3: Parallel Implementation (Worktree)

In the worktree's tmux session:

```bash
# Start your AI agent in the worktree
claude

# Implement the plan (the plan persists from main branch!)
> /implementing-plan thoughts/shared/plans/add-oauth.md

# Validate against success criteria
> /validating-plan thoughts/shared/plans/add-oauth.md
```

While implementation runs, you can continue other work in the main branch. Multiple worktrees can run simultaneously.

### Phase 4: Merge & Cleanup

```bash
# Back in main branch
thc worktree merge add-oauth

# This:
# - Rebases the feature branch
# - Fast-forward merges to target
# - Cleans up worktree and tmux session
# - Syncs thoughts
```

## Workflow Diagram

```
Main Branch                    Worktree (parallel)
    │
    ├── /researching-codebase
    │   └── writes to thoughts/shared/research/
    │
    ├── /creating-plan
    │   └── writes to thoughts/shared/plans/
    │
    ├── /iterating-plan (until ready)
    │
    ├── thc worktree add ──────────────────┐
    │                                      │
    │   (continue other work here)         ├── /implementing-plan
    │                                      │   └── reads plan, writes code
    │                                      │
    │                                      ├── /validating-plan
    │                                      │   └── verifies success criteria
    │                                      │
    ├── thc worktree merge ←───────────────┘
    │
    ▼
```

## Commands

### `thc worktree add <name>`

Create a new worktree with a dedicated tmux session.

```bash
thc worktree add feature-name
thc worktree add feature-name --branch custom-branch
thc worktree add feature-name --base origin/main
thc worktree add feature-name --detached
thc worktree add feature-name --no-thoughts
```

| Flag | Description |
|------|-------------|
| `--branch <branch>` | Branch name (defaults to `<name>`) |
| `--base <ref>` | Base ref/commit (default: `HEAD`) |
| `--path <path>` | Worktree directory path (default: `../<repo>__worktrees/<name>`) |
| `--detached` | Create a detached worktree at `<base>` (no branch) |
| `--no-thoughts` | Skip thoughts initialization |

### `thc worktree list`

List active worktrees and their tmux sessions.

```bash
thc worktree list
thc worktree list --all    # Show all git worktrees, not just managed ones
```

| Flag | Description |
|------|-------------|
| `--all` | Show all git worktrees (not just `../<repo>__worktrees`) |

### `thc worktree merge <name>`

Merge a worktree branch and clean up.

```bash
thc worktree merge feature-name
thc worktree merge feature-name --into main
thc worktree merge feature-name --keep-session --keep-branch
```

| Flag | Description |
|------|-------------|
| `--into <branch>` | Target branch to merge into (default: current branch in main worktree) |
| `--force` | Force cleanup even if uncommitted changes exist |
| `--keep-session` | Do not kill the tmux session |
| `--keep-worktree` | Do not remove the git worktree |
| `--keep-branch` | Do not delete the source branch |

### `thc worktree remove <name>`

Remove a worktree without merging.

```bash
thc worktree remove feature-name
thc worktree remove feature-name --force
```

| Flag | Description |
|------|-------------|
| `--force` | Force removal even with uncommitted changes or unmerged commits |
