import path from 'path'
import chalk from 'chalk'
import {
  isGitRepo,
  getMainWorktreeRoot,
  findWorktree,
  hasUncommittedChanges,
  runGitCommandOrThrow,
  runGitCommand,
} from '../../git.js'
import { loadHooksConfig, getHooksForEvent, executeHooks } from '../../hooks/index.js'
import {
  cleanupWorktreeThoughts,
  cleanupWorktreeTmuxSession,
  removeGitWorktree,
  deleteWorktreeBranch,
  type WorktreeMergeOptions,
} from './utils.js'

export async function worktreeMergeCommand(
  name: string,
  options: WorktreeMergeOptions,
): Promise<void> {
  try {
    if (!isGitRepo()) {
      console.error(chalk.red('Error: not in a git repository'))
      process.exit(1)
    }

    const mainRoot = getMainWorktreeRoot()
    const wtEntry = findWorktree(name, mainRoot)
    const wtPath = path.resolve(wtEntry.worktreePath)

    if (wtPath === path.resolve(mainRoot)) {
      console.error(chalk.red('Error: refusing to merge/remove the main worktree'))
      process.exit(1)
    }

    if (wtEntry.detached || wtEntry.branch === '(detached)') {
      console.error(chalk.red('Error: cannot merge a detached worktree'))
      process.exit(1)
    }

    const targetBranch =
      options.into ?? runGitCommand(['branch', '--show-current'], { cwd: mainRoot })
    if (!targetBranch) {
      console.error(chalk.red('Error: could not determine target branch. Use --into <branch>.'))
      process.exit(1)
    }

    if (targetBranch === wtEntry.branch) {
      console.error(chalk.red('Error: source and target branch are the same'))
      process.exit(1)
    }

    // Execute PreWorktreeMerge hooks
    const hooksConfig = loadHooksConfig(mainRoot)
    const preHooks = getHooksForEvent(hooksConfig, 'PreWorktreeMerge')

    if (preHooks.length > 0) {
      const hookEnv = {
        THC_WORKTREE_PATH: wtPath,
        THC_WORKTREE_NAME: name,
        THC_WORKTREE_BRANCH: wtEntry.branch,
        THC_TARGET_BRANCH: targetBranch,
        THC_MAIN_ROOT: mainRoot,
      }

      await executeHooks(
        preHooks,
        {
          hook_event_name: 'PreWorktreeMerge',
          cwd: mainRoot,
          worktree_path: wtPath,
          worktree_name: name,
          worktree_branch: wtEntry.branch,
          target_branch: targetBranch,
          main_root: mainRoot,
        },
        hookEnv,
        true,
      )
    }

    // Clean up thoughts before checking uncommitted changes
    // (thoughts/ directory would show as untracked and cause false positive)
    cleanupWorktreeThoughts(wtPath, { force: options.force, verbose: true })

    if (!options.force && hasUncommittedChanges(wtEntry.worktreePath)) {
      console.error(
        chalk.red('Error: worktree has uncommitted changes. Commit/stash first or use --force.'),
      )
      process.exit(1)
    }

    console.log(chalk.blue(`Rebasing ${wtEntry.branch} onto ${targetBranch}...`))
    runGitCommandOrThrow(['rebase', targetBranch], { cwd: wtEntry.worktreePath })

    console.log(chalk.blue(`Fast-forward merging into ${targetBranch}...`))
    runGitCommandOrThrow(['switch', targetBranch], { cwd: mainRoot })
    runGitCommandOrThrow(['merge', '--ff-only', wtEntry.branch], { cwd: mainRoot })

    if (!options.keepSession) {
      cleanupWorktreeTmuxSession(wtPath)
    }

    if (!options.keepWorktree) {
      removeGitWorktree(wtPath, mainRoot, { force: options.force })
    }

    if (!options.keepBranch) {
      deleteWorktreeBranch(wtEntry.branch, mainRoot, { force: options.force })
    }

    // Execute PostWorktreeMerge hooks
    const postHooks = getHooksForEvent(hooksConfig, 'PostWorktreeMerge')

    if (postHooks.length > 0) {
      const hookEnv = {
        THC_WORKTREE_PATH: wtPath,
        THC_WORKTREE_NAME: name,
        THC_WORKTREE_BRANCH: wtEntry.branch,
        THC_TARGET_BRANCH: targetBranch,
        THC_MAIN_ROOT: mainRoot,
        THC_KEPT_SESSION: options.keepSession ? 'true' : 'false',
        THC_KEPT_WORKTREE: options.keepWorktree ? 'true' : 'false',
        THC_KEPT_BRANCH: options.keepBranch ? 'true' : 'false',
      }

      await executeHooks(
        postHooks,
        {
          hook_event_name: 'PostWorktreeMerge',
          cwd: mainRoot,
          worktree_path: wtPath,
          worktree_name: name,
          worktree_branch: wtEntry.branch,
          target_branch: targetBranch,
          main_root: mainRoot,
          kept_session: options.keepSession ?? false,
          kept_worktree: options.keepWorktree ?? false,
          kept_branch: options.keepBranch ?? false,
        },
        hookEnv,
        true,
      )
    }

    console.log(chalk.green('✓ Merged and cleaned up'))
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`))
    process.exit(1)
  }
}
