import fs from 'fs'
import path from 'path'
import { agents } from './commands/agent/registry.js'

/** Canonical storage directory name */
const CANONICAL_DIR = '.thought-cabinet'

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
  /** Whether canonical storage was copied */
  canonicalCopied: boolean
}

/**
 * Detect which agent config directories exist in the source directory.
 * Scans for unique configDir values from the agent registry.
 */
function detectAgentConfigDirs(sourceDir: string): string[] {
  const uniqueDirs = [...new Set(Object.values(agents).map(a => a.configDir))]
  return uniqueDirs.filter(dir => fs.existsSync(path.join(sourceDir, dir)))
}

/**
 * Check if a path is a symlink pointing into the canonical directory.
 * Returns the relative path within canonical storage if true, null otherwise.
 */
function getCanonicalSymlinkTarget(entryPath: string, canonicalDir: string): string | null {
  try {
    if (!fs.lstatSync(entryPath).isSymbolicLink()) return null

    const linkTarget = fs.readlinkSync(entryPath)
    const resolvedTarget = path.resolve(path.dirname(entryPath), linkTarget)
    const resolvedCanonical = path.resolve(canonicalDir)

    const isInsideCanonical =
      resolvedTarget === resolvedCanonical ||
      resolvedTarget.startsWith(resolvedCanonical + path.sep)

    return isInsideCanonical ? path.relative(resolvedCanonical, resolvedTarget) : null
  } catch {
    return null
  }
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
 * Recursively copy a directory, handling symlinks that point into
 * canonical storage by recreating them relative to the target's canonical dir.
 */
function copyDirWithSymlinkHandling(
  srcDir: string,
  destDir: string,
  sourceCanonicalDir: string,
  targetCanonicalDir: string,
): void {
  fs.mkdirSync(destDir, { recursive: true })

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    const canonicalRelPath = getCanonicalSymlinkTarget(srcPath, sourceCanonicalDir)

    if (canonicalRelPath !== null) {
      // Recreate symlink pointing to target's canonical storage
      const newTarget = path.join(targetCanonicalDir, canonicalRelPath)
      symlinkOrCopy(srcPath, destPath, path.relative(path.dirname(destPath), newTarget))
    } else if (entry.isSymbolicLink()) {
      // Non-canonical symlink (e.g. global install) — preserve original target
      symlinkOrCopy(srcPath, destPath, fs.readlinkSync(srcPath))
    } else if (entry.isDirectory()) {
      copyDirWithSymlinkHandling(srcPath, destPath, sourceCanonicalDir, targetCanonicalDir)
    } else {
      fs.cpSync(srcPath, destPath)
    }
  }
}

/**
 * Copy agent configuration directories and canonical storage to a new worktree.
 *
 * Handles the canonical storage + symlink architecture:
 * 1. Copies .thought-cabinet/ (canonical storage) to the target
 * 2. For each agent config dir, recreates symlinks pointing to the target's .thought-cabinet/
 * 3. Non-symlink files are copied normally
 * 4. Global-scope symlinks (pointing outside the project) are preserved as-is
 */
export function copyAgentConfigDirs(options: CopyAgentConfigOptions): CopyAgentConfigResult {
  const { sourceDir, targetDir } = options
  const copied: string[] = []
  const skipped: string[] = []

  const sourceCanonicalDir = path.join(sourceDir, CANONICAL_DIR)
  const targetCanonicalDir = path.join(targetDir, CANONICAL_DIR)

  // Copy canonical storage (.thought-cabinet/)
  const canonicalCopied = fs.existsSync(sourceCanonicalDir)
  if (canonicalCopied) {
    fs.cpSync(sourceCanonicalDir, targetCanonicalDir, { recursive: true })
  }

  // Detect and copy agent config directories
  for (const dirName of detectAgentConfigDirs(sourceDir)) {
    try {
      copyDirWithSymlinkHandling(
        path.join(sourceDir, dirName),
        path.join(targetDir, dirName),
        sourceCanonicalDir,
        targetCanonicalDir,
      )
      copied.push(dirName)
    } catch {
      skipped.push(dirName)
    }
  }

  return { copied, skipped, canonicalCopied }
}
