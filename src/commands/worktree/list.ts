import path from 'path'
import chalk from 'chalk'
import {
  isGitRepo,
  getMainWorktreeRoot,
  getWorktreesBaseDir,
  runGitCommand,
  parseWorktreeListPorcelain,
} from '../../git.js'
import { allSessionNamesForHandle, listTmuxSessions } from '../../tmux.js'
import type { WorktreeListOptions } from './utils.js'

interface WorktreeRow {
  name: string
  branch: string
  tmux: string
  path: string
  isCurrent: boolean
}

export async function worktreeListCommand(options: WorktreeListOptions): Promise<void> {
  try {
    if (!isGitRepo()) {
      console.error(chalk.red('Error: not in a git repository'))
      process.exit(1)
    }

    const mainRoot = getMainWorktreeRoot()
    const baseDir = path.resolve(getWorktreesBaseDir(mainRoot))
    const cwd = path.resolve(process.cwd())

    const entries = parseWorktreeListPorcelain(
      runGitCommand(['worktree', 'list', '--porcelain'], { cwd: mainRoot }),
    )

    const sessions = new Set(listTmuxSessions())

    const filtered = options.all
      ? entries
      : entries.filter(e => {
          const p = path.resolve(e.worktreePath)
          return p === path.resolve(mainRoot) || p.startsWith(baseDir + path.sep)
        })

    if (filtered.length === 0) {
      console.log(chalk.gray('No worktrees found.'))
      return
    }

    const rows: WorktreeRow[] = filtered.map(e => {
      const name = path.basename(e.worktreePath)
      const isCurrent = path.resolve(e.worktreePath) === cwd
      return {
        name: isCurrent ? `* ${name}` : `  ${name}`,
        branch: e.branch,
        tmux: allSessionNamesForHandle(name).find(s => sessions.has(s)) ?? '-',
        path: e.worktreePath,
        isCurrent,
      }
    })

    const colWidths = {
      name: Math.max('  NAME'.length, ...rows.map(r => r.name.length)),
      branch: Math.max('BRANCH'.length, ...rows.map(r => r.branch.length)),
      tmux: Math.max('TMUX'.length, ...rows.map(r => r.tmux.length)),
    }

    // Print header
    const header =
      `${'  NAME'.padEnd(colWidths.name)}  ` +
      `${'BRANCH'.padEnd(colWidths.branch)}  ` +
      `${'TMUX'.padEnd(colWidths.tmux)}  ` +
      `PATH`
    console.log(chalk.blue(header))

    // Print rows
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
}
