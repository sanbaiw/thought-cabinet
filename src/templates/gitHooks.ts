/**
 * Current hook version - increment when hooks need updating
 */
export const HOOK_VERSION = '1'

/**
 * Parameters for generating pre-commit hook
 */
export interface PreCommitHookParams {
  hookPath: string
}

/**
 * Parameters for generating post-commit hook
 */
export interface PostCommitHookParams {
  hookPath: string
}

/**
 * Generates pre-commit Git hook content to prevent committing thoughts directory
 */
export function generatePreCommitHook({ hookPath }: PreCommitHookParams): string {
  return `#!/bin/bash
# ThoughtCabinet thoughts protection - prevent committing thoughts directory
# Version: ${HOOK_VERSION}

if git diff --cached --name-only | grep -q "^thoughts/"; then
    echo "❌ Cannot commit thoughts/ to code repository"
    echo "The thoughts directory should only exist in your separate thoughts repository."
    git reset HEAD -- thoughts/
    exit 1
fi

# Call any existing pre-commit hook
if [ -f "${hookPath}.old" ]; then
    "${hookPath}.old" "$@"
fi
`
}

/**
 * Generates post-commit Git hook content for auto-syncing thoughts
 */
export function generatePostCommitHook({ hookPath }: PostCommitHookParams): string {
  return `#!/bin/bash
# ThoughtCabinet thoughts auto-sync
# Version: ${HOOK_VERSION}

# Check if we're in a worktree
if [ -f .git ]; then
    # Skip auto-sync in worktrees to avoid repository boundary confusion
    exit 0
fi

# Get the commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Auto-sync thoughts after each commit (only in non-worktree repos)
thoughtcabinet sync --message "Auto-sync with commit: $COMMIT_MSG" >/dev/null 2>&1 &

# Call any existing post-commit hook
if [ -f "${hookPath}.old" ]; then
    "${hookPath}.old" "$@"
fi
`
}
