import fs from 'fs'
import path from 'path'
import { agents } from './commands/agent/registry.js'
import { CANONICAL_DIR } from './commands/agent/constants.js'

export interface CopyAgentConfigOptions {
  /** Source directory (main worktree) */
  sourceDir: string
  /** Target directory (new worktree) */
  targetDir: string
}

export interface CopyAgentConfigResult {
  /** Agent config directories that were copied */
  copied: string[]
  /** Agent config directories that were skipped (not present in source) */
  skipped: string[]
}

/**
 * Detect which agent config directories exist in the source directory.
 * Scans for unique configDir values from the agent registry.
 */
function detectAgentConfigDirs(sourceDir: string): string[] {
  const uniqueDirs = [...new Set(Object.values(agents).map(a => a.configDir))]
  // Also include the canonical intermediate directory
  uniqueDirs.push(CANONICAL_DIR)
  return uniqueDirs.filter(dir => fs.existsSync(path.join(sourceDir, dir)))
}

/**
 * Create a symlink at destPath, falling back to a dereferenced copy on failure.
 * Silently skips if both the symlink and copy fail (e.g. broken source symlink).
 */
function symlinkOrCopy(srcPath: string, destPath: string, linkTarget: string): void {
  try {
    fs.symlinkSync(linkTarget, destPath)
  } catch {
    try {
      fs.cpSync(srcPath, destPath, { recursive: true, dereference: true })
    } catch {
      // Skip — source symlink may be broken
    }
  }
}

/**
 * Recursively copy a directory, preserving symlinks as-is.
 */
function copyDirWithSymlinkHandling(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true })

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isSymbolicLink()) {
      symlinkOrCopy(srcPath, destPath, fs.readlinkSync(srcPath))
    } else if (entry.isDirectory()) {
      copyDirWithSymlinkHandling(srcPath, destPath)
    } else {
      fs.cpSync(srcPath, destPath)
    }
  }
}

/**
 * Copy agent configuration directories to a new worktree.
 *
 * Copies agent config dirs (e.g. .claude/) and the canonical intermediate
 * directory (.thought-cabinet/) so that project-scope symlinks resolve correctly.
 * Preserves symlinks as-is. Non-symlink files are copied normally.
 */
export function copyAgentConfigDirs(options: CopyAgentConfigOptions): CopyAgentConfigResult {
  const { sourceDir, targetDir } = options
  const copied: string[] = []
  const skipped: string[] = []

  // Detect and copy agent config directories
  for (const dirName of detectAgentConfigDirs(sourceDir)) {
    try {
      copyDirWithSymlinkHandling(path.join(sourceDir, dirName), path.join(targetDir, dirName))
      copied.push(dirName)
    } catch {
      skipped.push(dirName)
    }
  }

  return { copied, skipped }
}
