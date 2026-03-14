# CLI Reference

Full reference for all `thc` commands, flags, and options.

## Thoughts Management

### `thc init`

Initialize thoughts for the current repository. Sets up the thoughts directory structure with symlinks to the thoughts git repository.

```bash
thc init
thc init --profile work
thc init --directory my-project
```

| Flag                   | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `--force`              | Force reconfiguration even if already set up                     |
| `--directory <name>`   | Specify the repository directory name (skips interactive prompt) |
| `--profile <name>`     | Use a specific thoughts profile                                  |
| `--config-file <path>` | Path to config file                                              |

### `thc sync`

Sync thoughts to the git repository. Commits and pushes any changes in the thoughts repo.

```bash
thc sync
thc sync -m "Add auth research notes"
```

| Flag                      | Description             |
| ------------------------- | ----------------------- |
| `-m, --message <message>` | Commit message for sync |
| `--config-file <path>`    | Path to config file     |

### `thc status`

Show the status of the thoughts repository.

```bash
thc status
```

| Flag                   | Description         |
| ---------------------- | ------------------- |
| `--config-file <path>` | Path to config file |

### `thc destroy`

Remove thoughts setup from the current repository.

```bash
thc destroy
thc destroy --force
```

| Flag                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `--force`              | Force removal even if not in configuration |
| `--config-file <path>` | Path to config file                        |

### `thc prune`

Clean up stale repository mappings. Runs in dry-run mode by default.

```bash
thc prune          # Dry run — shows what would be removed
thc prune --apply  # Actually remove stale mappings
```

| Flag                   | Description                        |
| ---------------------- | ---------------------------------- |
| `--apply`              | Apply changes (default is dry-run) |
| `--config-file <path>` | Path to config file                |

### `thc migrate`

Migrate configuration from `~/.config/thought-cabinet/` to `~/.thought-cabinet/`. Moves config file, agent assets, and thoughts repos, then updates all paths in the config.

```bash
thc migrate            # Interactive migration with confirmation
thc migrate --dry-run  # Show what would be migrated without changes
```

| Flag                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `--dry-run`            | Show migration plan without making changes |
| `--config-file <path>` | Path to legacy config file                 |

## Agent Configuration

### `thc agent init`

Interactively discover and install skills and agents to your AI coding agent's config directory.

Assets are installed via **symlink** by default: a canonical copy is stored in `.thought-cabinet/` (project) or `~/.thought-cabinet/` (global), and symlinks are created in the agent's config directory. This means updating the canonical copy updates all agents at once.

```bash
thc agent init                          # Interactive installation
thc agent init --all                    # Install all without prompting
thc agent init --target claude-code     # Install for a specific agent
thc agent init --target cursor codex    # Install for multiple agents
thc agent init --global                 # Install to global scope
thc agent init --mode copy              # Copy files instead of symlinking
thc agent init --force                  # Overwrite existing installations
```

| Flag                   | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `--target <agents...>` | Target agents (e.g., `claude-code`, `codebuddy`, `cursor`, `codex`, `gemini-cli`, `cline`) |
| `-g, --global`         | Install to global scope                                                                    |
| `--mode <mode>`        | Installation mode: `symlink` (default) or `copy`                                           |
| `--force`              | Force overwrite of existing installations                                                  |
| `--all`                | Install all assets without prompting                                                       |

#### Installed Skills

| Skill             | Slash Command        | Description                                                           |
| ----------------- | -------------------- | --------------------------------------------------------------------- |
| research-codebase | `/research-codebase` | Deep-dive into codebase, save findings to `thoughts/shared/research/` |
| creating-plan     | `/creating-plan`     | Create implementation plan with phases and success criteria           |
| iterating-plan    | `/iterating-plan`    | Refine existing plans based on feedback                               |
| implementing-plan | `/implementing-plan` | Execute plan phase-by-phase with verification                         |
| validating-plan   | `/validating-plan`   | Verify implementation against plan's success criteria                 |
| commit            | `/commit`            | Create git commits with clear, descriptive messages                   |

#### Installed Agents

| Agent                   | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| codebase-analyzer       | Analyzes codebase implementation details for specific components         |
| codebase-locator        | Locates files, directories, and components relevant to a feature or task |
| codebase-pattern-finder | Finds similar implementations, usage examples, or existing patterns      |
| code-simplifier         | Simplifies and refines code for clarity and maintainability              |
| thoughts-analyzer       | Deep-dives on research topics stored in thoughts                         |
| thoughts-locator        | Discovers relevant documents in the thoughts directory                   |
| web-search-researcher   | Searches the web for up-to-date information                              |

## Worktree Management

See [WORKTREES.md](WORKTREES.md) for the full worktree workflow guide.

### `thc worktree add <name>`

Create a git worktree with a dedicated tmux session and synced thoughts.

| Flag                | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `--branch <branch>` | Branch name (defaults to `<name>`)                               |
| `--base <ref>`      | Base ref/commit (default: `HEAD`)                                |
| `--path <path>`     | Worktree directory path (default: `../<repo>__worktrees/<name>`) |
| `--detached`        | Create a detached worktree at `<base>` (no branch)               |
| `--no-thoughts`     | Skip thoughts initialization                                     |

### `thc worktree list`

List active worktrees and tmux sessions.

| Flag    | Description                                    |
| ------- | ---------------------------------------------- |
| `--all` | Show all git worktrees (not just managed ones) |

### `thc worktree merge <name>`

Merge worktree branch and clean up.

| Flag              | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `--into <branch>` | Target branch to merge into (default: current branch in main worktree) |
| `--force`         | Force cleanup even if uncommitted changes exist                        |
| `--keep-session`  | Do not kill the tmux session                                           |
| `--keep-worktree` | Do not remove the git worktree                                         |
| `--keep-branch`   | Do not delete the source branch                                        |

### `thc worktree remove <name>`

Remove a worktree without merging.

| Flag      | Description                                                     |
| --------- | --------------------------------------------------------------- |
| `--force` | Force removal even with uncommitted changes or unmerged commits |

## Profiles

Use different thoughts repositories for different contexts (work, personal, etc.).

### `thc profile create <name>`

Create a new thoughts profile.

```bash
thc profile create work --repo ~/work-thoughts
thc profile create personal --repo ~/personal-thoughts
```

| Flag                   | Description              |
| ---------------------- | ------------------------ |
| `--repo <path>`        | Thoughts repository path |
| `--repos-dir <name>`   | Repos directory name     |
| `--global-dir <name>`  | Global directory name    |
| `--config-file <path>` | Path to config file      |

### `thc profile list`

List all profiles.

```bash
thc profile list
thc profile list --json
```

| Flag                   | Description         |
| ---------------------- | ------------------- |
| `--json`               | Output as JSON      |
| `--config-file <path>` | Path to config file |

### `thc profile show <name>`

Show details for a specific profile.

| Flag                   | Description         |
| ---------------------- | ------------------- |
| `--json`               | Output as JSON      |
| `--config-file <path>` | Path to config file |

### `thc profile delete <name>`

Delete a profile.

| Flag                   | Description                   |
| ---------------------- | ----------------------------- |
| `--force`              | Force deletion even if in use |
| `--config-file <path>` | Path to config file           |

## Configuration

### `thc config`

View or edit the Thought Cabinet configuration.

```bash
thc config           # View configuration
thc config --edit    # Open in editor
thc config --json    # Output as JSON
```

| Flag                   | Description                  |
| ---------------------- | ---------------------------- |
| `--edit`               | Open configuration in editor |
| `--json`               | Output configuration as JSON |
| `--config-file <path>` | Path to config file          |

Configuration is stored at `~/.thought-cabinet/config.json` (falls back to `~/.config/thought-cabinet/config.json`; respects `XDG_CONFIG_HOME`).

## Hooks

### `thc hooks init`

Initialize the hooks configuration file (`.thought-cabinet/hooks.json`) in the current repository.

```bash
thc hooks init
```

See [HOOKS.md](HOOKS.md) for the full hooks reference.

## Shell Completion

### `thc completion install`

Install shell completion scripts for bash/zsh.

```bash
thc completion install
```

### `thc completion uninstall`

Remove shell completion scripts.

```bash
thc completion uninstall
```

## Metadata

### `thc metadata`

Display repository metadata used by Thought Cabinet.

```bash
thc metadata
```
