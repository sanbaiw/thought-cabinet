import { Command } from 'commander'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

interface WorktreeEntry {
  worktreePath: string
  branch: string
  detached: boolean
}

interface GitRunOptions {
  cwd?: string
}

interface WorktreeAddOptions {
  branch?: string
  base: string
  path?: string
  detached?: boolean
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

function run(cmd: string, args: string[], opts: GitRunOptions = {}): string {
  return execFileSync(cmd, args, {
    cwd: opts.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function runOrThrow(cmd: string, args: string[], opts: GitRunOptions = {}): void {
  execFileSync(cmd, args, {
    cwd: opts.cwd,
    stdio: 'inherit',
  })
}

function validateWorktreeHandle(name: string): void {
  // Keep the handle portable across OSes and safe for default paths.
  // Allow: letters, numbers, dot, underscore, dash. Must start with alnum.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    throw new Error(
      `Invalid worktree name '${name}'. Use only [A-Za-z0-9._-] and start with a letter/number.`,
    )
  }
}

function isGitRepo(cwd?: string): boolean {
  try {
    run('git', ['rev-parse', '--git-dir'], { cwd })
    return true
  } catch {
    return false
  }
}

function parseWorktreeListPorcelain(output: string): WorktreeEntry[] {
  const blocks = output.trim().length === 0 ? [] : output.trim().split(/\n\n+/)
  const out: WorktreeEntry[] = []

  for (const block of blocks) {
    let worktreePath = ''
    let branch = ''
    let detached = false

    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) {
        worktreePath = line.slice('worktree '.length).trim()
      } else if (line.startsWith('branch refs/heads/')) {
        branch = line.slice('branch refs/heads/'.length).trim()
      } else if (line.trim() === 'detached') {
        detached = true
        branch = '(detached)'
      }
    }

    if (worktreePath && branch) {
      out.push({ worktreePath, branch, detached })
    }
  }

  return out
}

function getMainWorktreeRoot(cwd?: string): string {
  const list = run('git', ['worktree', 'list', '--porcelain'], { cwd })
  const entries = parseWorktreeListPorcelain(list)
  if (entries.length === 0) {
    throw new Error('No git worktrees found')
  }
  // First entry is the main worktree.
  return entries[0].worktreePath
}

function getWorktreesBaseDir(mainWorktreeRoot: string): string {
  const repoName = path.basename(mainWorktreeRoot)
  const parent = path.dirname(mainWorktreeRoot)
  return path.join(parent, `${repoName}__worktrees`)
}

function findWorktree(nameOrBranch: string, cwd?: string): WorktreeEntry {
  const list = run('git', ['worktree', 'list', '--porcelain'], { cwd })
  const entries = parseWorktreeListPorcelain(list)

  // 1) Match by handle (directory name)
  for (const e of entries) {
    if (path.basename(e.worktreePath) === nameOrBranch) {
      return e
    }
  }

  // 2) Match by branch name
  for (const e of entries) {
    if (e.branch === nameOrBranch) {
      return e
    }
  }

  throw new Error(`Worktree not found: ${nameOrBranch}`)
}

function hasUncommittedChanges(repoPath: string): boolean {
  const status = run('git', ['status', '--porcelain'], { cwd: repoPath })
  return status.trim().length > 0
}

function setBranchBase(branch: string, base: string, cwd?: string): void {
  runOrThrow('git', ['config', '--local', `branch.${branch}.thc-base`, base], { cwd })
}

function listTmuxSessions(): string[] {
  try {
    const out = run('tmux', ['list-sessions', '-F', '#{session_name}'])
    return out
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function tmuxHasSession(sessionName: string): boolean {
  try {
    execFileSync('tmux', ['has-session', '-t', sessionName], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

function tmuxNewSession(sessionName: string, cwd: string): void {
  runOrThrow('tmux', ['new-session', '-d', '-s', sessionName, '-c', cwd])
}

function tmuxKillSession(sessionName: string): void {
  try {
    execFileSync('tmux', ['kill-session', '-t', sessionName], { stdio: 'ignore' })
  } catch {
    // ignore
  }
}

function sessionNameForHandle(handle: string): string {
  // NOTE: tmux uses ':' as a target separator (session:window.pane),
  // so ':' is not allowed in session names on many tmux versions.
  return `thc-${handle}`
}

function legacySessionNameForHandle(handle: string): string {
  return `thc:${handle}`
}

function allSessionNamesForHandle(handle: string): string[] {
  return [sessionNameForHandle(handle), legacySessionNameForHandle(handle)]
}

export function worktreeCommand(program: Command): void {
  const wt = program.command('worktree').description('Manage git worktrees bound to tmux sessions')

  wt.command('add <name>')
    .description('Create a git worktree and a tmux session for it')
    .option('--branch <branch>', 'Branch name (defaults to <name>)')
    .option('--base <ref>', 'Base ref/commit (default: HEAD)', 'HEAD')
    .option('--path <path>', 'Worktree directory path (default: ../<repo>__worktrees/<name>)')
    .option('--detached', 'Create a detached worktree at <base> (no branch)')
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

        if (options.detached) {
          runOrThrow('git', ['worktree', 'add', '--detach', worktreePath, options.base], {
            cwd: mainRoot,
          })
        } else {
          const branch = (options.branch as string | undefined) ?? name
          runOrThrow('git', ['worktree', 'add', '-b', branch, worktreePath, options.base], {
            cwd: mainRoot,
          })
          setBranchBase(branch, options.base, worktreePath)
        }

        tmuxNewSession(sessionName, worktreePath)

        console.log(chalk.green('✓ Worktree created'))
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
          run('git', ['worktree', 'list', '--porcelain'], { cwd: mainRoot }),
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

        console.log('NAME\tBRANCH\tTMUX\tPATH')
        for (const e of filtered) {
          const name = path.basename(e.worktreePath)
          const sessionName = allSessionNamesForHandle(name).find(s => sessions.has(s))
          console.log(`${name}\t${e.branch}\t${sessionName ?? '-'}\t${e.worktreePath}`)
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
          run('git', ['branch', '--show-current'], { cwd: mainRoot })
        if (!targetBranch) {
          console.error(chalk.red('Error: could not determine target branch. Use --into <branch>.'))
          process.exit(1)
        }

        if (targetBranch === wtEntry.branch) {
          console.error(chalk.red('Error: source and target branch are the same'))
          process.exit(1)
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
        runOrThrow('git', ['rebase', targetBranch], { cwd: wtEntry.worktreePath })

        console.log(chalk.blue(`Fast-forward merging into ${targetBranch}...`))
        runOrThrow('git', ['switch', targetBranch], { cwd: mainRoot })
        runOrThrow('git', ['merge', '--ff-only', wtEntry.branch], { cwd: mainRoot })

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

          runOrThrow('git', removeArgs, { cwd: mainRoot })

          // Best-effort prune
          try {
            runOrThrow('git', ['worktree', 'prune'], { cwd: mainRoot })
          } catch {
            // ignore
          }
        }

        if (!options.keepBranch) {
          // Best-effort delete; should succeed after ff merge.
          try {
            runOrThrow('git', ['branch', '-d', wtEntry.branch], { cwd: mainRoot })
          } catch {
            if (options.force) {
              runOrThrow('git', ['branch', '-D', wtEntry.branch], { cwd: mainRoot })
            } else {
              throw new Error(
                `Failed to delete branch '${wtEntry.branch}'. Re-run with --force to delete it.`,
              )
            }
          }
        }

        console.log(chalk.green('✓ Merged and cleaned up'))
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`))
        process.exit(1)
      }
    })
}

export const __test__ = {
  parseWorktreeListPorcelain,
  getWorktreesBaseDir,
  sessionNameForHandle,
}
