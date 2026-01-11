# Thought Cabinet

A CLI tool for managing developer thoughts and notes across multiple repositories.

## Overview

Thought Cabinet provides a systematic way to organize and version-control your development notes, decisions, and ideas. It synchronizes thoughts across a dedicated git repository while keeping them separate from your code repositories.

## Features

- **Multi-repository support**: Manage thoughts for multiple projects from a single thoughts repository
- **Profile support**: Use different thoughts repositories for different contexts (e.g., work, personal)
- **Git integration**: Automatic git hooks prevent accidental commits and auto-sync thoughts
- **Searchable index**: Hard links enable fast searching across all thoughts
- **User separation**: Personal and shared thought spaces for team collaboration

## Installation

```bash
npm install -g thought-cabinet
```

## Quick Start

### Initialize thoughts for a repository

```bash
cd your-project
thoughtcabinet init
```

This will:

1. Set up a global thoughts repository (default: `~/thoughts`)
2. Create directory structure for this project
3. Install git hooks for protection and auto-sync
4. Create symlinks in `thoughts/` directory

### Sync thoughts manually

```bash
thoughtcabinet sync
```

### Check status

```bash
thoughtcabinet status
```

## Directory Structure

After initialization, your repository will have:

```
your-project/
└── thoughts/
    ├── yourusername/    → Your personal notes for this project
    ├── shared/          → Team-shared notes for this project
    ├── global/          → Cross-project thoughts
    │   ├── yourusername/ - Your personal cross-repo notes
    │   └── shared/      - Team cross-repo notes
    └── searchable/      → Hard links for searching
```

## Commands

### Basic Commands

- `thoughtcabinet init` - Initialize thoughts for current repository
- `thoughtcabinet sync` - Manually sync thoughts to repository
- `thoughtcabinet status` - Show status of thoughts repository
- `thoughtcabinet config` - View or edit configuration
- `thoughtcabinet destroy` - Remove thoughts setup from current repository

### Profile Commands

Profiles allow you to use different thoughts repositories for different contexts:

- `thoughtcabinet profile create <name>` - Create a new profile
- `thoughtcabinet profile list` - List all profiles
- `thoughtcabinet profile show <name>` - Show profile details
- `thoughtcabinet profile delete <name>` - Delete a profile

Use a profile with:

```bash
thoughtcabinet init --profile work
```

## Configuration

Configuration is stored in `~/.config/thought-cabinet/config.json`.

View configuration:

```bash
thoughtcabinet config
```

Edit configuration:

```bash
thoughtcabinet config --edit
```

## Hooks

Thought Cabinet supports hooks that execute custom commands when events occur. Configure hooks in `.thought-cabinet/hooks.json`:

```json
{
  "hooks": {
    "PostWorktreeAdd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm install",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

See [docs/HOOKS.md](docs/HOOKS.md) for complete documentation.

## Git Hooks

Thought Cabinet installs two git hooks:

1. **pre-commit**: Prevents accidental commits of the `thoughts/` directory
2. **post-commit**: Auto-syncs thoughts after each code commit

## Searching Thoughts

The `thoughts/searchable/` directory contains hard links to all accessible thought files. This allows search tools to find content without following symlinks:

```bash
cd your-project
grep -r "TODO" thoughts/searchable/
```

**Important**: Always reference files by their canonical path (e.g., `thoughts/yourusername/todo.md`) rather than the searchable path.

## Best Practices

1. Use `yourusername/` for personal, repository-specific notes
2. Use `shared/` for team documentation that should be version-controlled
3. Use `global/yourusername/` for cross-repository personal notes
4. Use `global/shared/` for cross-repository team documentation
5. Run `thoughtcabinet sync` before sharing important updates
6. Never commit the `thoughts/` directory to your code repository

## Migration from hlyr

If you're migrating from the hlyr thoughts system:

1. The configuration format is compatible
2. Your existing thoughts repository will work as-is
3. Run `thoughtcabinet init` in your repositories
4. Old git hooks will be automatically updated

## License

Apache-2.0
