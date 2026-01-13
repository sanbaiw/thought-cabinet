import { Command } from 'commander'
import { worktreeAddCommand } from './worktree/add.js'
import { worktreeListCommand } from './worktree/list.js'
import { worktreeMergeCommand } from './worktree/merge.js'
import { worktreeRemoveCommand } from './worktree/remove.js'

export function worktreeCommand(program: Command): void {
  const wt = program.command('worktree').description('Manage git worktrees bound to tmux sessions')

  wt.command('add <name>')
    .description('Create a git worktree and a tmux session for it')
    .option('--branch <branch>', 'Branch name (defaults to <name>)')
    .option('--base <ref>', 'Base ref/commit (default: HEAD)', 'HEAD')
    .option('--path <path>', 'Worktree directory path (default: ../<repo>__worktrees/<name>)')
    .option('--detached', 'Create a detached worktree at <base> (no branch)')
    .option('--no-thoughts', 'Skip thoughts initialization')
    .action(worktreeAddCommand)

  wt.command('list')
    .description('List thc-managed worktrees and their tmux sessions')
    .option('--all', 'Show all git worktrees (not just ../<repo>__worktrees)')
    .action(worktreeListCommand)

  wt.command('merge <name>')
    .description(
      'Rebase worktree branch onto target, ff-merge, then clean up worktree + tmux session',
    )
    .option(
      '--into <branch>',
      'Target branch to merge into (default: current branch in main worktree)',
    )
    .option('--force', 'Force cleanup even if uncommitted changes exist')
    .option('--keep-session', 'Do not kill the tmux session')
    .option('--keep-worktree', 'Do not remove the git worktree')
    .option('--keep-branch', 'Do not delete the source branch')
    .action(worktreeMergeCommand)

  wt.command('remove <name>')
    .description(
      'Remove a worktree and clean up associated resources (tmux session, thoughts, branch)',
    )
    .option('--force', 'Force removal even with uncommitted changes or unmerged commits')
    .action(worktreeRemoveCommand)
}
