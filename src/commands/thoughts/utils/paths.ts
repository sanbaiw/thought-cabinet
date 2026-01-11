import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import type { ResolvedProfileConfig } from './config.js'

export function getDefaultThoughtsRepo(): string {
  return path.join(os.homedir(), 'thoughts')
}

export function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2))
  }
  return path.resolve(filePath)
}

export function getCurrentRepoPath(): string {
  return process.cwd()
}

export function getRepoNameFromPath(repoPath: string): string {
  // Extract a reasonable name from the repo path
  const parts = repoPath.split(path.sep)
  return parts[parts.length - 1] || 'unnamed_repo'
}

// Overloaded signatures for getRepoThoughtsPath
export function getRepoThoughtsPath(config: ResolvedProfileConfig, repoName: string): string
export function getRepoThoughtsPath(
  thoughtsRepo: string,
  reposDir: string,
  repoName: string,
): string
export function getRepoThoughtsPath(
  thoughtsRepoOrConfig: string | ResolvedProfileConfig,
  reposDirOrRepoName: string,
  repoName?: string,
): string {
  if (typeof thoughtsRepoOrConfig === 'string') {
    // Legacy signature: (thoughtsRepo, reposDir, repoName)
    return path.join(expandPath(thoughtsRepoOrConfig), reposDirOrRepoName, repoName!)
  }

  // New signature: (config, repoName)
  const config = thoughtsRepoOrConfig
  return path.join(expandPath(config.thoughtsRepo), config.reposDir, reposDirOrRepoName)
}

// Overloaded signatures for getGlobalThoughtsPath
export function getGlobalThoughtsPath(config: ResolvedProfileConfig): string
export function getGlobalThoughtsPath(thoughtsRepo: string, globalDir: string): string
export function getGlobalThoughtsPath(
  thoughtsRepoOrConfig: string | ResolvedProfileConfig,
  globalDir?: string,
): string {
  if (typeof thoughtsRepoOrConfig === 'string') {
    // Legacy signature: (thoughtsRepo, globalDir)
    return path.join(expandPath(thoughtsRepoOrConfig), globalDir!)
  }

  // New signature: (config)
  const config = thoughtsRepoOrConfig
  return path.join(expandPath(config.thoughtsRepo), config.globalDir)
}

/**
 * 获取当前 git 仓库的主仓库路径（处理 worktree 场景）
 * 如果当前目录是 worktree，返回主仓库路径；否则返回 null
 */
export function getMainRepoPath(): string | null {
  try {
    // 获取 git common dir（对于 worktree 指向主仓库的 .git）
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    // 获取当前 repo 的 .git 目录
    const gitDir = execSync('git rev-parse --git-dir', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    // 如果两者不同，说明是 worktree
    if (gitCommonDir !== gitDir && gitCommonDir !== '.git') {
      // gitCommonDir 是类似 /path/to/main-repo/.git 的路径
      // 需要去掉末尾的 .git 得到主仓库路径
      const mainRepoPath = path.dirname(path.resolve(gitCommonDir))
      return mainRepoPath
    }

    return null // 不是 worktree
  } catch {
    return null
  }
}
