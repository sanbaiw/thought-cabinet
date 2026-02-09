# Thought Cabinet

A CLI tool that integrates AI coding agents into structured development workflows through filesystem-based memory and context management.

## Why Thought Cabinet?

AI coding agents like Claude Code are powerful but face key challenges:

- **Context limits**: Large codebases exceed model context windows
- **No persistent memory**: Agents forget learnings between sessions
- **Unstructured work**: Complex tasks benefit from planning before implementation
- **Isolation**: AI-generated knowledge isn't easily shared with teams

Thought Cabinet solves these by providing:

- **Context offloading**: Research and plans are saved to disk, freeing model context
- **Filesystem memory**: Version-controlled thoughts persist across sessions
- **Structured workflows**: Slash commands guide agents through research → plan → implement → validate
- **Team sharing**: Thoughts sync via git, enabling knowledge sharing

## Core Concepts

### Thoughts as Memory

The `thoughts/` directory is a filesystem-based memory system for AI agents:

```
thoughts/
├── {user}/           → Personal notes (your learnings, scratchpad)
├── shared/           → Team-shared knowledge
│   ├── research/     → Codebase research documents
│   └── plans/        → Implementation plans
└── global/           → Cross-repository thoughts
```

All thoughts are version-controlled via a dedicated git repository, separate from your code.

### Structured Workflows

Instead of asking an AI to "implement feature X" directly, Thought Cabinet encourages a disciplined workflow:

1. **Research** → Understand the codebase deeply
2. **Plan** → Design the implementation with explicit phases
3. **Implement** → Execute the plan systematically
4. **Validate** → Verify against success criteria

### Worktree Isolation

Each feature gets its own git worktree with a dedicated tmux session, enabling:

- Parallel development on multiple features
- Clean separation between research (main branch) and implementation (worktree)
- Easy cleanup and merge when done

## Installation

```bash
npm install -g thought-cabinet
```

## Claude Code Integration

Thought Cabinet provides slash commands, agents, and skills that integrate with Claude Code. Install them via `thc agent init`.

### Installing Agent Configuration

```bash
cd your-project
thc agent init
```

This interactively installs to `.claude/`:

- **Commands** - Slash commands for workflow phases (`/research_codebase`, `/create_plan`, etc.)
- **Agents** - Specialized sub-agents for code analysis and research
- **Skills** - Extended capabilities like document generation
- **Settings** - Project permissions and configuration

Options:

```bash
thc agent init --all              # Copy all files without prompting
thc agent init --force            # Overwrite existing .claude directory
thc agent init --name codebuddy   # Use alternative agent (codebuddy)
```

### Slash Commands

These commands guide the AI through each phase of development:

| Command              | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `/research_codebase` | Deep-dive into codebase, save findings to `thoughts/shared/research/` |
| `/create_plan`       | Create implementation plan with phases and success criteria           |
| `/iterate_plan`      | Refine existing plans based on feedback                               |
| `/implement_plan`    | Execute plan phase-by-phase with verification                         |
| `/validate_plan`     | Verify implementation against plan's success criteria                 |

### Context Offloading

AI agents have limited context windows. Thought Cabinet offloads context to the filesystem:

```
┌─────────────────┐     ┌─────────────────────────────┐
│  Model Context  │     │  filesystem (thoughts/)     │
├─────────────────┤     ├─────────────────────────────┤
│ Current task    │ ←── │ research/auth-system.md     │
│ Active code     │     │ plans/add-oauth.md          │
│ Recent changes  │     │ previous session learnings  │
└─────────────────┘     └─────────────────────────────┘
```

- `/research_codebase` writes comprehensive analysis to disk, then only the relevant sections are read when needed
- `/create_plan` produces detailed plans that persist across sessions
- The AI can reference previous research without re-exploring the entire codebase

### Filesystem-Based Memory

Unlike conversation history that disappears, thoughts persist:

```bash
# Research from last week is still available
cat thoughts/shared/research/2024-01-05-payment-system.md

# Plans from past features inform new ones
ls thoughts/shared/plans/

# Personal learnings accumulate
cat thoughts/yourusername/gotchas.md
```

All thoughts are git-tracked, so you can:

- Share knowledge with team members via `thc sync`
- See how understanding evolved over time
- Recover context even after months

## The Worktree + tmux + Parallel Workflow

For complex features, Thought Cabinet enables a powerful parallel workflow:

### Phase 1: Research & Planning (Main Branch)

```bash
# In your main branch, start Claude Code
cd your-project
claude

# Research the codebase
> /research_codebase
> How does the authentication system work?

# Create an implementation plan
> /create_plan
> Add OAuth2 support based on the research

# Iterate until the plan is solid
> /iterate_plan thoughts/shared/plans/add-oauth.md
```

### Phase 2: Create Worktree

```bash
# Create isolated worktree with tmux session
thc worktree add add-oauth

# This creates:
# - New git worktree at ../your-project-add-oauth/
# - Dedicated tmux session (thc-add-oauth)
# - Thoughts initialized and synced in worktree
```

### Phase 3: Parallel Implementation (Worktree)

In the worktree's tmux session:

```bash
# Start Claude Code in the worktree
claude

# Implement the plan (the plan persists from main branch!)
> /implement_plan thoughts/shared/plans/add-oauth.md

# Validate against success criteria
> /validate_plan thoughts/shared/plans/add-oauth.md
```

**Parallel work**: While implementation runs, you can continue other work in the main branch. Multiple worktrees can run simultaneously.

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

### Workflow Diagram

```
Main Branch                    Worktree (parallel)
    │
    ├── /research_codebase
    │   └── writes to thoughts/shared/research/
    │
    ├── /create_plan
    │   └── writes to thoughts/shared/plans/
    │
    ├── /iterate_plan (until ready)
    │
    ├── thc worktree add ──────────────────┐
    │                                      │
    │   (continue other work here)         ├── /implement_plan
    │                                      │   └── reads plan, writes code
    │                                      │
    │                                      ├── /validate_plan
    │                                      │   └── verifies success criteria
    │                                      │
    ├── thc worktree merge ←───────────────┘
    │
    ▼
```

## Quick Start

### Initialize Thoughts

```bash
cd your-project
thc init
```

This sets up:

- A global thoughts repository (default: `~/thoughts`)
- Directory structure for this project
- Git hooks for protection and auto-sync
- Symlinks in `thoughts/` directory

### Basic Usage

```bash
# Edit thoughts directly
vim thoughts/yourusername/notes.md

# Sync changes
thc sync

# Check status
thc status
```

### Worktree Commands

```bash
# Create worktree with tmux session
thc worktree add feature-name

# List active worktrees
thc worktree list

# Merge and cleanup
thc worktree merge feature-name
```

## CLI Commands

### Agent Configuration

```bash
thc agent init            # Install Claude Code slash commands, agents, and skills
thc agent init --all      # Install all without prompting
thc agent init --force    # Overwrite existing configuration
```

### Thoughts Management

```bash
thc init              # Initialize thoughts for current repository
thc sync              # Sync thoughts to repository
thc status            # Show status of thoughts repository
thc destroy           # Remove thoughts setup from repository
thc prune             # Clean up stale repository mappings
```

### Worktree Management

```bash
thc worktree add <name>     # Create worktree + tmux session
thc worktree list           # List worktrees and sessions
thc worktree merge <name>   # Merge and cleanup worktree
```

### Profiles

Use different thoughts repositories for different contexts (work, personal):

```bash
thc profile create <name>   # Create a new profile
thc profile list            # List all profiles
thc init --profile work     # Initialize with specific profile
```

### Configuration

```bash
thc config           # View configuration
thc config --edit    # Edit configuration
```

Configuration is stored in `~/.config/thought-cabinet/config.json`.

## Hooks

### Custom Hooks

Configure hooks in `.thought-cabinet/hooks.json` to run commands on events:

```json
{
  "hooks": {
    "PostWorktreeAdd": [
      {
        "hooks": [{ "type": "command", "command": "npm install", "timeout": 300 }]
      }
    ]
  }
}
```

**Available events:**

- `PreWorktreeAdd`, `PostWorktreeAdd` - Worktree creation
- `PreWorktreeMerge`, `PostWorktreeMerge` - Worktree merge
- `PostThoughtsInit`, `PostThoughtsDestroy`, `PostThoughtsSync` - Thoughts lifecycle

### Git Hooks

Automatically installed git hooks:

- **pre-commit**: Prevents accidental commits of `thoughts/` directory
- **post-commit**: Auto-syncs thoughts after each commit

## Directory Structure

```
your-project/
└── thoughts/
    ├── yourusername/    → Personal notes for this project
    ├── shared/          → Team-shared notes
    │   ├── research/    → Codebase research documents
    │   └── plans/       → Implementation plans
    ├── global/          → Cross-project thoughts
    └── searchable/      → Hard links for grep/ripgrep
```

## Best Practices

**For AI-assisted development:**

- Always run `/research_codebase` before planning complex features
- Use `/create_plan` to make implementation explicit and verifiable
- Implement in worktrees for maximum throughput
- Run `/validate_plan` before merging to catch deviations

**General tips:**

- Run `thc sync` frequently to share knowledge
- Use `thc prune` to clean up stale mappings

## License

Apache-2.0

## Credits

- the name "Thought Cabinet" is from CRPG [Disco Elysium](https://en.wikipedia.org/wiki/Disco_Elysium) created by Robert Kurvitz, Aleksander Rostov, Helen Hindpere and others
- the thoughts system is based on [humanlayer](https://github.com/humanlayer/humanlayer)
