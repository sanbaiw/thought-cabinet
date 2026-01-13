import path from 'path'
import chalk from 'chalk'
import {
  isGitRepo,
  getMainWorktreeRoot,
  findWorktree,
  hasUncommittedChanges,
  hasUnmergedCommits,
  getDefaultBranch,
} from '../../git.js'
import { loadHooksConfig, getHooksForEvent, executeHooks } from '../../hooks/index.js'
import {
  cleanupWorktreeThoughts,
  cleanupWorktreeTmuxSession,
  removeGitWorktree,
  deleteWorktreeBranch,
  type WorktreeRemoveOptions,
} from './utils.js'

export async function worktreeRemoveCommand(
  name: string,
  options: WorktreeRemoveOptions,
): Promise<void> {
  try {
    if (!isGitRepo()) {
      console.error(chalk.red('Error: not in a git repository'))
      process.exit(1)
    }

    const mainRoot = getMainWorktreeRoot()
    const wtEntry = findWorktree(name, mainRoot)
    const wtPath = path.resolve(wtEntry.worktreePath)
    const hasBranch = !wtEntry.detached && wtEntry.branch !== '(detached)'

    if (wtPath === path.resolve(mainRoot)) {
      console.error(chalk.red('Error: refusing to remove the main worktree'))
      process.exit(1)
    }

    // Check for unmerged commits (only if branch exists)
    if (!options.force && hasBranch) {
      const defaultBranch = getDefaultBranch(mainRoot)
      if (hasUnmergedCommits(wtEntry.branch, defaultBranch, mainRoot)) {
        console.error(
          chalk.red(
            `Error: branch '${wtEntry.branch}' has commits not merged into '${defaultBranch}'. ` +
              `Merge first or use --force to discard.`,
          ),
        )
        process.exit(1)
      }
    }

    // Execute PreWorktreeRemove hooks
    const hooksConfig = loadHooksConfig(mainRoot)
    const preHooks = getHooksForEvent(hooksConfig, 'PreWorktreeRemove')

    if (preHooks.length > 0) {
      const hookEnv = {
        THC_WORKTREE_PATH: wtPath,
        THC_WORKTREE_NAME: name,
        THC_WORKTREE_BRANCH: wtEntry.branch,
        THC_MAIN_ROOT: mainRoot,
      }

      await executeHooks(
        preHooks,
        {
          hook_event_name: 'PreWorktreeRemove',
          cwd: mainRoot,
          worktree_path: wtPath,
          worktree_name: name,
          worktree_branch: wtEntry.branch,
          main_root: mainRoot,
        },
        hookEnv,
        true,
      )
    }

    // Clean up thoughts directory before checking uncommitted changes
    // (thoughts/ directory would show as untracked and cause false positive)
    cleanupWorktreeThoughts(wtPath, { force: options.force, verbose: true })

    if (!options.force && hasUncommittedChanges(wtEntry.worktreePath)) {
      console.error(
        chalk.red('Error: worktree has uncommitted changes. Commit/stash first or use --force.'),
      )
      process.exit(1)
    }

    cleanupWorktreeTmuxSession(wtPath)

    console.log(chalk.gray('Removing git worktree...'))
    removeGitWorktree(wtPath, mainRoot, { force: options.force })

    if (hasBranch) {
      console.log(chalk.gray(`Deleting branch '${wtEntry.branch}'...`))
      try {
        deleteWorktreeBranch(wtEntry.branch, mainRoot, { force: options.force })
      } catch (error) {
        console.log(chalk.yellow(`Warning: ${(error as Error).message}`))
      }
    }

    // Execute PostWorktreeRemove hooks
    const postHooks = getHooksForEvent(hooksConfig, 'PostWorktreeRemove')

    if (postHooks.length > 0) {
      const hookEnv = {
        THC_WORKTREE_PATH: wtPath,
        THC_WORKTREE_NAME: name,
        THC_WORKTREE_BRANCH: wtEntry.branch,
        THC_MAIN_ROOT: mainRoot,
      }

      await executeHooks(
        postHooks,
        {
          hook_event_name: 'PostWorktreeRemove',
          cwd: mainRoot,
          worktree_path: wtPath,
          worktree_name: name,
          worktree_branch: wtEntry.branch,
          main_root: mainRoot,
        },
        hookEnv,
        true,
      )
    }

    console.log(chalk.green('✓ Worktree removed'))
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`))
    process.exit(1)
  }
}
