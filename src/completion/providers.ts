import { loadConfigFile } from '../config.js'
import {
  isGitRepo,
  runGitCommand,
  parseWorktreeListPorcelain,
  getMainWorktreeRoot,
  getWorktreesBaseDir,
} from '../git.js'
import path from 'path'

/**
 * Get list of profile names from config
 */
export function getProfileNames(): string[] {
  try {
    const config = loadConfigFile()
    if (!config.thoughts?.profiles) {
      return []
    }
    return Object.keys(config.thoughts.profiles)
  } catch {
    return []
  }
}

/**
 * Get list of worktree names (directory basenames)
 */
export function getWorktreeNames(): string[] {
  try {
    if (!isGitRepo()) {
      return []
    }

    const mainRoot = getMainWorktreeRoot()
    const baseDir = getWorktreesBaseDir(mainRoot)
    const output = runGitCommand(['worktree', 'list', '--porcelain'])
    const entries = parseWorktreeListPorcelain(output)

    // Filter to only thc-managed worktrees and extract names
    return entries
      .filter(e => {
        const p = path.resolve(e.worktreePath)
        return p.startsWith(baseDir + path.sep)
      })
      .map(e => path.basename(e.worktreePath))
  } catch {
    return []
  }
}

/**
 * Get list of local branch names
 */
export function getBranchNames(): string[] {
  try {
    if (!isGitRepo()) {
      return []
    }

    const output = runGitCommand(['branch', '--format=%(refname:short)'])
    return output.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get list of agent names
 */
export function getAgentNames(): string[] {
  return ['claude', 'codebuddy']
}
