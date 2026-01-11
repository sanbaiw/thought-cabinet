import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

import {
  isGitRepo,
  validateWorktreeHandle,
  getMainWorktreeRoot,
  getWorktreesBaseDir,
  findWorktree,
  hasUncommittedChanges,
  setBranchBase,
  runGitCommandOrThrow,
  runGitCommand,
  parseWorktreeListPorcelain,
} from '../git.js'

import {
  sessionNameForHandle,
  allSessionNamesForHandle,
  listTmuxSessions,
  tmuxHasSession,
  tmuxNewSession,
  tmuxKillSession,
} from '../tmux.js'

import { copyAgentConfigDirs } from '../agent-config.js'
import {
  loadThoughtsConfig,
  saveThoughtsConfig,
  createThoughtsDirectoryStructure,
  cleanupThoughtsDirectory,
} from './thoughts/utils/index.js'
import { setupThoughtsDirectory, pullThoughtsFromRemote } from './thoughts/init-core.js'
import { resolveProfileForRepo, getRepoNameFromMapping } from './thoughts/profile/utils.js'
import { loadHooksConfig, getHooksForEvent, executeHooks } from '../hooks/index.js'

interface WorktreeAddOptions {
  branch?: string
  base: string
  path?: string
  detached?: boolean
  thoughts?: boolean
}

interface WorktreeListOptions {
  all?: boolean
}

interface WorktreeMergeOptions {
  into?: string
  force?: boolean
  keepSession?: boolean
  keepWorktree?: boolean
  keepBranch?: boolean
}

export function worktreeCommand(program: Command): void {
  const wt = program.command('worktree').description('Manage git worktrees bound to tmux sessions')

  wt.command('add <name>')
    .description('Create a git worktree and a tmux session for it')
    .option('--branch <branch>', 'Branch name (defaults to <name>)')
    .option('--base <ref>', 'Base ref/commit (default: HEAD)', 'HEAD')
    .option('--path <path>', 'Worktree directory path (default: ../<repo>__worktrees/<name>)')
    .option('--detached', 'Create a detached worktree at <base> (no branch)')
    .option('--no-thoughts', 'Skip thoughts initialization')
    .action(async (name: string, options: WorktreeAddOptions) => {
      try {
        validateWorktreeHandle(name)

        if (!isGitRepo()) {
          console.error(chalk.red('Error: not in a git repository'))
          process.exit(1)
        }

        const mainRoot = getMainWorktreeRoot()
        const baseDir = getWorktreesBaseDir(mainRoot)
        const worktreePath = options.path ? path.resolve(options.path) : path.join(baseDir, name)

        fs.mkdirSync(path.dirname(worktreePath), { recursive: true })

        const sessionName = sessionNameForHandle(name)
        const sessionCandidates = allSessionNamesForHandle(name)
        const existing = sessionCandidates.find(s => tmuxHasSession(s))
        if (existing) {
          console.error(chalk.red(`Error: tmux session already exists: ${existing}`))
          process.exit(1)
        }

        // Execute PreWorktreeAdd hooks
        const hooksConfig = loadHooksConfig(mainRoot)
        const preAddHooks = getHooksForEvent(hooksConfig, 'PreWorktreeAdd')

        if (preAddHooks.length > 0) {
          const hookInput = {
            hook_event_name: 'PreWorktreeAdd' as const,
            cwd: mainRoot,
            worktree_path: worktreePath,
            worktree_name: name,
            worktree_branch: options.detached
              ? ''
              : ((options.branch as string | undefined) ?? name),
            main_root: mainRoot,
            session_name: sessionName,
            base_ref: options.base,
          }

          const hookEnv = {
            THC_WORKTREE_PATH: worktreePath,
            THC_WORKTREE_NAME: name,
            THC_WORKTREE_BRANCH: hookInput.worktree_branch,
            THC_MAIN_ROOT: mainRoot,
            THC_SESSION_NAME: sessionName,
            THC_BASE_REF: options.base,
          }

          await executeHooks(preAddHooks, hookInput, hookEnv, true)
        }

        if (options.detached) {
          runGitCommandOrThrow(['worktree', 'add', '--detach', worktreePath, options.base], {
            cwd: mainRoot,
          })
        } else {
          const branch = (options.branch as string | undefined) ?? name
          runGitCommandOrThrow(['worktree', 'add', '-b', branch, worktreePath, options.base], {
            cwd: mainRoot,
          })
          setBranchBase(branch, options.base, worktreePath)
        }

        tmuxNewSession(sessionName, worktreePath)

        // Copy agent configuration directories (always)
        const configResult = copyAgentConfigDirs({
          sourceDir: mainRoot,
          targetDir: worktreePath,
        })
        if (configResult.copied.length > 0) {
          console.log(chalk.gray(`Copied config: ${configResult.copied.join(', ')}`))
        }

        // Initialize thoughts (unless --no-thoughts is specified)
        if (options.thoughts !== false) {
          const config = loadThoughtsConfig({})
          if (config) {
            const mainRepoMapping = config.repoMappings[mainRoot]
            const mappedName = getRepoNameFromMapping(mainRepoMapping)

            if (mappedName) {
              // Add repo mapping for new worktree
              config.repoMappings[worktreePath] = mainRepoMapping
              saveThoughtsConfig(config, {})

              const profileConfig = resolveProfileForRepo(config, worktreePath)

              // Ensure the thoughts directory structure exists in thoughts repo
              createThoughtsDirectoryStructure(profileConfig, mappedName, config.user)

              // Set up thoughts directory
              const result = setupThoughtsDirectory({
                repoPath: worktreePath,
                profileConfig,
                mappedName,
                user: config.user,
                createSearchable: true,
                setupHooks: true,
              })

              console.log(chalk.gray('Thoughts initialized'))
              if (result.hooksUpdated.length > 0) {
                console.log(chalk.gray(`Updated git hooks: ${result.hooksUpdated.join(', ')}`))
              }

              // Sync thoughts from remote
              if (pullThoughtsFromRemote(profileConfig.thoughtsRepo)) {
                console.log(chalk.gray('Pulled latest thoughts from remote'))
              }
            } else {
              console.log(chalk.yellow('Main repo not configured for thoughts, skipping'))
            }
          } else {
            console.log(chalk.yellow('Thoughts not configured globally, skipping'))
          }
        }

        // Execute PostWorktreeAdd hooks
        const postAddHooks = getHooksForEvent(hooksConfig, 'PostWorktreeAdd')

        if (postAddHooks.length > 0) {
          const hookInput = {
            hook_event_name: 'PostWorktreeAdd' as const,
            cwd: worktreePath,
            worktree_path: worktreePath,
            worktree_name: name,
            worktree_branch: options.detached
              ? ''
              : ((options.branch as string | undefined) ?? name),
            main_root: mainRoot,
            session_name: sessionName,
          }

          const hookEnv = {
            THC_WORKTREE_PATH: worktreePath,
            THC_WORKTREE_NAME: name,
            THC_WORKTREE_BRANCH: hookInput.worktree_branch,
            THC_MAIN_ROOT: mainRoot,
            THC_SESSION_NAME: sessionName,
          }

          await executeHooks(postAddHooks, hookInput, hookEnv, true)
        }

        console.log(chalk.green('\n✓ Worktree created'))
        console.log(chalk.gray(`Path: ${worktreePath}`))
        console.log(chalk.gray(`Tmux session: ${sessionName}`))
        console.log(chalk.gray(`Attach: tmux attach -t ${sessionName}`))
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`))
        process.exit(1)
      }
    })

  wt.command('list')
    .description('List thc-managed worktrees and their tmux sessions')
    .option('--all', 'Show all git worktrees (not just ../<repo>__worktrees)')
    .action(async (options: WorktreeListOptions) => {
      try {
        if (!isGitRepo()) {
          console.error(chalk.red('Error: not in a git repository'))
          process.exit(1)
        }

        const mainRoot = getMainWorktreeRoot()
        const baseDir = getWorktreesBaseDir(mainRoot)
        const baseDirResolved = path.resolve(baseDir)

        const entries = parseWorktreeListPorcelain(
          runGitCommand(['worktree', 'list', '--porcelain'], { cwd: mainRoot }),
        )

        const sessions = new Set(listTmuxSessions())

        const filtered = options.all
          ? entries
          : entries.filter(e => {
              const p = path.resolve(e.worktreePath)
              return p === path.resolve(mainRoot) || p.startsWith(baseDirResolved + path.sep)
            })

        if (filtered.length === 0) {
          console.log(chalk.gray('No worktrees found.'))
          return
        }

        // Get current working directory for highlighting
        const cwd = process.cwd()

        // Prepare data rows with current marker
        const rows = filtered.map(e => {
          const name = path.basename(e.worktreePath)
          const sessionName = allSessionNamesForHandle(name).find(s => sessions.has(s)) ?? '-'
          const isCurrent = path.resolve(e.worktreePath) === path.resolve(cwd)
          return {
            name: isCurrent ? `* ${name}` : `  ${name}`,
            branch: e.branch,
            tmux: sessionName,
            path: e.worktreePath,
            isCurrent,
          }
        })

        // Calculate column widths
        const colWidths = {
          name: Math.max('NAME'.length + 2, ...rows.map(r => r.name.length)),
          branch: Math.max('BRANCH'.length, ...rows.map(r => r.branch.length)),
          tmux: Math.max('TMUX'.length, ...rows.map(r => r.tmux.length)),
        }

        // Print header
        console.log(
          chalk.blue(
            `${'  NAME'.padEnd(colWidths.name)}  ` +
              `${'BRANCH'.padEnd(colWidths.branch)}  ` +
              `${'TMUX'.padEnd(colWidths.tmux)}  ` +
              `PATH`,
          ),
        )

        // Print data rows
        for (const row of rows) {
          const line =
            `${row.name.padEnd(colWidths.name)}  ` +
            `${row.branch.padEnd(colWidths.branch)}  ` +
            `${row.tmux.padEnd(colWidths.tmux)}  ` +
            `${row.path}`

          console.log(row.isCurrent ? chalk.green(line) : line)
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`))
        process.exit(1)
      }
    })

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
    .action(async (name: string, options: WorktreeMergeOptions) => {
      try {
        if (!isGitRepo()) {
          console.error(chalk.red('Error: not in a git repository'))
          process.exit(1)
        }

        const mainRoot = getMainWorktreeRoot()
        const mainRootResolved = path.resolve(mainRoot)

        const wtEntry = findWorktree(name, mainRoot)
        const wtResolved = path.resolve(wtEntry.worktreePath)

        if (wtResolved === mainRootResolved) {
          console.error(chalk.red('Error: refusing to merge/remove the main worktree'))
          process.exit(1)
        }

        if (wtEntry.detached || wtEntry.branch === '(detached)') {
          console.error(chalk.red('Error: cannot merge a detached worktree'))
          process.exit(1)
        }

        const targetBranch =
          (options.into as string | undefined) ??
          runGitCommand(['branch', '--show-current'], { cwd: mainRoot })
        if (!targetBranch) {
          console.error(chalk.red('Error: could not determine target branch. Use --into <branch>.'))
          process.exit(1)
        }

        if (targetBranch === wtEntry.branch) {
          console.error(chalk.red('Error: source and target branch are the same'))
          process.exit(1)
        }

        // Execute PreWorktreeMerge hooks
        const mergeHooksConfig = loadHooksConfig(mainRoot)
        const preMergeHooks = getHooksForEvent(mergeHooksConfig, 'PreWorktreeMerge')

        if (preMergeHooks.length > 0) {
          const hookInput = {
            hook_event_name: 'PreWorktreeMerge' as const,
            cwd: mainRoot,
            worktree_path: wtResolved,
            worktree_name: name,
            worktree_branch: wtEntry.branch,
            target_branch: targetBranch,
            main_root: mainRoot,
          }

          const hookEnv = {
            THC_WORKTREE_PATH: wtResolved,
            THC_WORKTREE_NAME: name,
            THC_WORKTREE_BRANCH: wtEntry.branch,
            THC_TARGET_BRANCH: targetBranch,
            THC_MAIN_ROOT: mainRoot,
          }

          await executeHooks(preMergeHooks, hookInput, hookEnv, true)
        }

        // Clean up thoughts before checking uncommitted changes
        const config = loadThoughtsConfig({})
        if (config && config.repoMappings[wtResolved]) {
          try {
            console.log(chalk.gray('Cleaning up thoughts directory...'))
            const result = cleanupThoughtsDirectory({
              repoPath: wtResolved,
              config,
              force: options.force,
              verbose: false, // Suppress detailed output during merge
            })

            if (result.configRemoved) {
              saveThoughtsConfig(config, {})
            }

            if (result.thoughtsRemoved) {
              console.log(chalk.gray('✓ Thoughts directory cleaned up'))
            }
          } catch (error) {
            // Log error but don't fail the merge
            console.log(
              chalk.yellow(`Warning: Could not clean up thoughts: ${(error as Error).message}`),
            )
          }
        }

        if (!options.force && hasUncommittedChanges(wtEntry.worktreePath)) {
          console.error(
            chalk.red(
              'Error: worktree has uncommitted changes. Commit/stash first or use --force.',
            ),
          )
          process.exit(1)
        }

        console.log(chalk.blue(`Rebasing ${wtEntry.branch} onto ${targetBranch}...`))
        runGitCommandOrThrow(['rebase', targetBranch], { cwd: wtEntry.worktreePath })

        console.log(chalk.blue(`Fast-forward merging into ${targetBranch}...`))
        runGitCommandOrThrow(['switch', targetBranch], { cwd: mainRoot })
        runGitCommandOrThrow(['merge', '--ff-only', wtEntry.branch], { cwd: mainRoot })

        const handle = path.basename(wtEntry.worktreePath)
        const sessionNames = allSessionNamesForHandle(handle)

        if (!options.keepSession) {
          for (const s of sessionNames) {
            tmuxKillSession(s)
          }
        }

        if (!options.keepWorktree) {
          const removeArgs = ['worktree', 'remove']
          if (options.force) {
            removeArgs.push('--force')
          }
          removeArgs.push(wtEntry.worktreePath)

          runGitCommandOrThrow(removeArgs, { cwd: mainRoot })

          // Best-effort prune
          try {
            runGitCommandOrThrow(['worktree', 'prune'], { cwd: mainRoot })
          } catch {
            // ignore
          }
        }

        if (!options.keepBranch) {
          // Best-effort delete; should succeed after ff merge.
          try {
            runGitCommandOrThrow(['branch', '-d', wtEntry.branch], { cwd: mainRoot })
          } catch {
            if (options.force) {
              runGitCommandOrThrow(['branch', '-D', wtEntry.branch], { cwd: mainRoot })
            } else {
              throw new Error(
                `Failed to delete branch '${wtEntry.branch}'. Re-run with --force to delete it.`,
              )
            }
          }
        }

        // Execute PostWorktreeMerge hooks
        const postMergeHooks = getHooksForEvent(mergeHooksConfig, 'PostWorktreeMerge')

        if (postMergeHooks.length > 0) {
          const hookInput = {
            hook_event_name: 'PostWorktreeMerge' as const,
            cwd: mainRoot,
            worktree_path: wtResolved,
            worktree_name: name,
            worktree_branch: wtEntry.branch,
            target_branch: targetBranch,
            main_root: mainRoot,
            kept_session: options.keepSession || false,
            kept_worktree: options.keepWorktree || false,
            kept_branch: options.keepBranch || false,
          }

          const hookEnv = {
            THC_WORKTREE_PATH: wtResolved,
            THC_WORKTREE_NAME: name,
            THC_WORKTREE_BRANCH: wtEntry.branch,
            THC_TARGET_BRANCH: targetBranch,
            THC_MAIN_ROOT: mainRoot,
            THC_KEPT_SESSION: options.keepSession ? 'true' : 'false',
            THC_KEPT_WORKTREE: options.keepWorktree ? 'true' : 'false',
            THC_KEPT_BRANCH: options.keepBranch ? 'true' : 'false',
          }

          await executeHooks(postMergeHooks, hookInput, hookEnv, true)
        }

        console.log(chalk.green('✓ Merged and cleaned up'))
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`))
        process.exit(1)
      }
    })
}

export const __test__ = {
  // Re-export from modules for test compatibility
  parseWorktreeListPorcelain,
  getWorktreesBaseDir,
  sessionNameForHandle,
}
