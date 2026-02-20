# Thought Cabinet

A CLI tool that gives AI coding agents persistent, structured memory through filesystem-based notes and version-controlled knowledge sharing.

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

## Quick Start

```bash
cd your-project

# 1. Install
npm install -g thought-cabinet

# 2. Initialize thoughts in your project
thc init

# 3. Install skills to your AI agent
thc agent init

# 4. Use skills in your agent session (e.g. Claude Code)
> /researching-codebase How does the authentication system work?
> /creating-plan Add OAuth2 support based on the research
> /implementing-plan thoughts/shared/plans/add-oauth.md
> /validating-plan thoughts/shared/plans/add-oauth.md
```

## Skills

Skills are installed by `thc agent init` and invoked as slash commands in your agent session:

| Skill                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `/researching-codebase` | Deep-dive into codebase, save findings to `thoughts/shared/research/` |
| `/creating-plan`        | Create implementation plan with phases and success criteria           |
| `/iterating-plan`       | Refine existing plans based on feedback                               |
| `/implementing-plan`    | Execute plan phase-by-phase with verification                         |
| `/validating-plan`      | Verify implementation against plan's success criteria                 |
| `/commit`               | Create git commits with clear, descriptive messages                   |

**Typical workflow**: research the codebase to build understanding, create a plan, iterate until the plan is solid, implement it, then validate the result.

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

All thoughts are version-controlled via a dedicated git repository, separate from your code. Sync with `thc sync`.

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

Research and plans are written to disk. The agent reads back only what it needs, freeing context for active work.

## CLI Overview

| Command          | Description                                       |
| ---------------- | ------------------------------------------------- |
| `thc init`       | Initialize thoughts for current repository        |
| `thc sync`       | Sync thoughts to git repository                   |
| `thc status`     | Show thoughts repository status                   |
| `thc agent init` | Install skills and agents to your AI coding agent |
| `thc config`     | View or edit configuration                        |

See [docs/CLI.md](docs/CLI.md) for the full command reference with all flags and options.

## Advanced Topics

- **[Worktrees](docs/WORKTREES.md)** — Parallel development with git worktrees and tmux sessions
- **[Hooks](docs/HOOKS.md)** — Custom hooks that run on thought and worktree lifecycle events

## License

Apache-2.0

## Credits

- The name "Thought Cabinet" is from CRPG [Disco Elysium](https://en.wikipedia.org/wiki/Disco_Elysium) created by Robert Kurvitz, Aleksander Rostov, Helen Hindpere and others
- The thoughts system is based on [humanlayer](https://github.com/humanlayer/humanlayer)
