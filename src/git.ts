import { execFileSync } from 'child_process'
import path from 'path'

// Types
export interface WorktreeEntry {
  worktreePath: string
  branch: string
  detached: boolean
}

export interface GitRunOptions {
  cwd?: string
}

// Command execution
export function runGitCommand(args: string[], opts: GitRunOptions = {}): string {
  return execFileSync('git', args, {
    cwd: opts.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

export function runGitCommandOrThrow(args: string[], opts: GitRunOptions = {}): void {
  execFileSync('git', args, {
    cwd: opts.cwd,
    stdio: 'inherit',
  })
}

// Repository detection
export function isGitRepo(cwd?: string): boolean {
  try {
    runGitCommand(['rev-parse', '--git-dir'], { cwd })
    return true
  } catch {
    return false
  }
}

/**
 * 获取当前 git 仓库的主仓库路径（处理 worktree 场景）
 * 如果当前目录是 worktree，返回主仓库路径；否则返回 null
 */
export function getMainRepoPath(): string | null {
  try {
    const gitCommonDir = runGitCommand(['rev-parse', '--git-common-dir'])
    const gitDir = runGitCommand(['rev-parse', '--git-dir'])

    if (gitCommonDir !== gitDir && gitCommonDir !== '.git') {
      const mainRepoPath = path.dirname(path.resolve(gitCommonDir))
      return mainRepoPath
    }

    return null
  } catch {
    return null
  }
}

// Worktree handle validation
export function validateWorktreeHandle(name: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    throw new Error(
      `Invalid worktree name '${name}'. Use only [A-Za-z0-9._-] and start with a letter/number.`,
    )
  }
}

// Worktree list parsing
export function parseWorktreeListPorcelain(output: string): WorktreeEntry[] {
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

// Worktree operations
export function getMainWorktreeRoot(cwd?: string): string {
  const list = runGitCommand(['worktree', 'list', '--porcelain'], { cwd })
  const entries = parseWorktreeListPorcelain(list)
  if (entries.length === 0) {
    throw new Error('No git worktrees found')
  }
  return entries[0].worktreePath
}

export function getWorktreesBaseDir(mainWorktreeRoot: string): string {
  const repoName = path.basename(mainWorktreeRoot)
  const parent = path.dirname(mainWorktreeRoot)
  return path.join(parent, `${repoName}__worktrees`)
}

export function findWorktree(nameOrBranch: string, cwd?: string): WorktreeEntry {
  const list = runGitCommand(['worktree', 'list', '--porcelain'], { cwd })
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

// Status checking
export function hasUncommittedChanges(repoPath: string): boolean {
  const status = runGitCommand(['status', '--porcelain'], { cwd: repoPath })
  return status.trim().length > 0
}

// Configuration
export function setBranchBase(branch: string, base: string, cwd?: string): void {
  runGitCommandOrThrow(['config', '--local', `branch.${branch}.thc-base`, base], { cwd })
}
