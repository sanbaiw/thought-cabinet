import path from 'path'
import chalk from 'chalk'
import { allSessionNamesForHandle, tmuxKillSession } from '../../tmux.js'
import { runGitCommandOrThrow } from '../../git.js'
import {
  loadThoughtsConfig,
  saveThoughtsConfig,
  cleanupThoughtsDirectory,
} from '../thoughts/utils/index.js'

export interface WorktreeAddOptions {
  branch?: string
  base: string
  path?: string
  detached?: boolean
  thoughts?: boolean
}

export interface WorktreeListOptions {
  all?: boolean
}

export interface WorktreeMergeOptions {
  into?: string
  force?: boolean
  keepSession?: boolean
  keepWorktree?: boolean
  keepBranch?: boolean
}

export interface WorktreeRemoveOptions {
  force?: boolean
}

/**
 * Clean up thoughts directory for a worktree
 */
export function cleanupWorktreeThoughts(
  wtPath: string,
  options: { force?: boolean; verbose?: boolean } = {},
): void {
  const config = loadThoughtsConfig({})
  if (!config || !config.repoMappings[wtPath]) {
    return
  }

  try {
    if (options.verbose) {
      console.log(chalk.gray('Cleaning up thoughts directory...'))
    }
    const result = cleanupThoughtsDirectory({
      repoPath: wtPath,
      config,
      force: options.force,
      verbose: false,
    })

    if (result.configRemoved) {
      saveThoughtsConfig(config, {})
    }

    if (result.thoughtsRemoved && options.verbose) {
      console.log(chalk.gray('✓ Thoughts directory cleaned up'))
    }
  } catch (error) {
    if (options.verbose) {
      console.log(chalk.yellow(`Warning: Could not clean up thoughts: ${(error as Error).message}`))
    }
  }
}

/**
 * Kill tmux sessions for a worktree
 */
export function cleanupWorktreeTmuxSession(wtPath: string): void {
  const handle = path.basename(wtPath)
  const sessionNames = allSessionNamesForHandle(handle)
  for (const s of sessionNames) {
    tmuxKillSession(s)
  }
}

/**
 * Remove git worktree
 */
export function removeGitWorktree(
  wtPath: string,
  mainRoot: string,
  options: { force?: boolean } = {},
): void {
  const removeArgs = ['worktree', 'remove']
  if (options.force) {
    removeArgs.push('--force')
  }
  removeArgs.push(wtPath)
  runGitCommandOrThrow(removeArgs, { cwd: mainRoot })

  // Best-effort prune
  try {
    runGitCommandOrThrow(['worktree', 'prune'], { cwd: mainRoot })
  } catch {
    // ignore
  }
}

/**
 * Delete a branch
 */
export function deleteWorktreeBranch(
  branch: string,
  mainRoot: string,
  options: { force?: boolean } = {},
): void {
  try {
    runGitCommandOrThrow(['branch', '-d', branch], { cwd: mainRoot })
  } catch {
    if (options.force) {
      runGitCommandOrThrow(['branch', '-D', branch], { cwd: mainRoot })
    } else {
      throw new Error(`Failed to delete branch '${branch}'. Re-run with --force to force delete.`)
    }
  }
}
