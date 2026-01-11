# Hooks Reference

Thought Cabinet supports hooks that execute custom commands when specific events occur.

## Configuration

Hooks are configured in `.thc/hooks.json` at the repository root:

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

## Hook Events

### Worktree Hooks

- **PreWorktreeAdd**: Before creating a worktree
- **PostWorktreeAdd**: After worktree + tmux + thoughts setup completes
- **PreWorktreeMerge**: Before merge operations begin
- **PostWorktreeMerge**: After merge + cleanup completes

### Thoughts Hooks

- **PostThoughtsInit**: After thoughts initialization completes
- **PostThoughtsDestroy**: After thoughts cleanup completes
- **PostThoughtsSync**: After sync completes

## Hook Configuration

### Fields

- `type`: Hook type (currently only `"command"` is supported)
- `command`: Shell command to execute
- `timeout`: Optional timeout in seconds (default: 60)

### Environment Variables

Hooks receive event-specific environment variables:

#### PostWorktreeAdd

- `THC_WORKTREE_PATH`: Path to new worktree
- `THC_WORKTREE_NAME`: Name/handle
- `THC_WORKTREE_BRANCH`: Branch name (empty if detached)
- `THC_MAIN_ROOT`: Main worktree root
- `THC_SESSION_NAME`: Tmux session name

#### PostWorktreeMerge

- `THC_WORKTREE_PATH`: Path to worktree being merged
- `THC_WORKTREE_NAME`: Name/handle
- `THC_WORKTREE_BRANCH`: Branch being merged
- `THC_TARGET_BRANCH`: Target branch
- `THC_MAIN_ROOT`: Main worktree root
- `THC_KEPT_SESSION`: "true" if session was kept
- `THC_KEPT_WORKTREE`: "true" if worktree was kept
- `THC_KEPT_BRANCH`: "true" if branch was kept

#### PostThoughtsInit

- `THC_THOUGHTS_REPO`: Path to thoughts repository
- `THC_REPOS_DIR`: Repository directory name
- `THC_GLOBAL_DIR`: Global directory name
- `THC_MAPPED_NAME`: Mapped repository name
- `THC_USER`: Username

#### PostThoughtsDestroy

- `THC_THOUGHTS_REMOVED`: "true" if thoughts directory was removed
- `THC_CONFIG_REMOVED`: "true" if config was removed
- `THC_MAPPED_NAME`: Mapped repository name
- `THC_PROFILE_NAME`: Profile name (if used)

#### PostThoughtsSync

- `THC_THOUGHTS_REPO`: Path to thoughts repository
- `THC_HAS_CHANGES`: "true" if there were changes to sync
- `THC_SEARCHABLE_CREATED`: "true" if searchable index was created

### Hook Input (stdin)

Hooks receive JSON input via stdin containing event data:

```json
{
  "hook_event_name": "PostWorktreeAdd",
  "cwd": "/path/to/worktree",
  "worktree_path": "/path/to/worktree",
  "worktree_name": "feature-branch",
  "worktree_branch": "feature-branch",
  "main_root": "/path/to/main",
  "session_name": "thc-feature-branch"
}
```

## Exit Codes

Hooks communicate status through exit codes:

- **Exit code 0**: Success. stdout is shown in verbose mode.
- **Exit code 2**: Blocking error. stderr is shown to user.
- **Other exit codes**: Non-blocking error. stderr is shown in verbose mode. Execution continues.

## Examples

### Install dependencies after creating worktree

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

### Run linter after thoughts sync

```json
{
  "hooks": {
    "PostThoughtsSync": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:thoughts"
          }
        ]
      }
    ]
  }
}
```

### Multiple hooks for same event

```json
{
  "hooks": {
    "PostWorktreeAdd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm install"
          },
          {
            "type": "command",
            "command": "npm run build"
          }
        ]
      }
    ]
  }
}
```

### Custom script with hook input

Create `.thc/scripts/post-add.sh`:

```bash
#!/bin/bash

# Read hook input from stdin
INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')
BRANCH=$(echo "$INPUT" | jq -r '.worktree_branch')

echo "Setting up worktree at $WORKTREE_PATH for branch $BRANCH"

# Install dependencies
npm install

# Create .env file
cp .env.example .env

exit 0
```

Configure hook:

```json
{
  "hooks": {
    "PostWorktreeAdd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".thc/scripts/post-add.sh"
          }
        ]
      }
    ]
  }
}
```

## Timeouts

Default timeout is 60 seconds. Configure per-hook:

```json
{
  "hooks": {
    "PostWorktreeAdd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm run long-running-task",
            "timeout": 600
          }
        ]
      }
    ]
  }
}
```

## Error Handling

- Hooks run in parallel for the same event
- Hook failures don't block command completion (except Pre hooks with exit code 2 in future versions)
- Hook stdout/stderr is displayed to user
- Timed-out hooks are killed gracefully (SIGTERM, then SIGKILL after 5s)
