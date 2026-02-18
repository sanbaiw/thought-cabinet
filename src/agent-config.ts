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
 * Scans for all configDir values from the agent registry.
 */
function detectAgentConfigDirs(sourceDir: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const agent of Object.values(agents)) {
    const dirName = agent.configDir
    if (seen.has(dirName)) continue
    seen.add(dirName)

    if (fs.existsSync(path.join(sourceDir, dirName))) {
      result.push(dirName)
    }
  }

  return result
}

/**
 * Check if a path is a symlink pointing into .thought-cabinet/
 * Returns the relative symlink target if true, null otherwise.
 */
function getCanonicalSymlinkTarget(entryPath: string, canonicalDir: string): string | null {
  try {
    const stats = fs.lstatSync(entryPath)
    if (!stats.isSymbolicLink()) return null

    const linkTarget = fs.readlinkSync(entryPath)
    const resolvedTarget = path.resolve(path.dirname(entryPath), linkTarget)
    const resolvedCanonical = path.resolve(canonicalDir)

    if (
      resolvedTarget.startsWith(resolvedCanonical + path.sep) ||
      resolvedTarget === resolvedCanonical
    ) {
      return path.relative(resolvedCanonical, resolvedTarget)
    }

    return null
  } catch {
    return null
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

  const entries = fs.readdirSync(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    // Check if this is a symlink into canonical storage
    const canonicalRelPath = getCanonicalSymlinkTarget(srcPath, sourceCanonicalDir)

    if (canonicalRelPath !== null) {
      // Recreate symlink pointing to target's canonical storage
      const newTarget = path.join(targetCanonicalDir, canonicalRelPath)
      const relativePath = path.relative(path.dirname(destPath), newTarget)
      try {
        fs.symlinkSync(relativePath, destPath)
      } catch {
        // Fallback: copy the dereferenced content
        try {
          fs.cpSync(srcPath, destPath, { recursive: true, dereference: true })
        } catch {
          // Skip if source symlink is already broken
        }
      }
    } else if (entry.isSymbolicLink()) {
      // Symlink NOT pointing into canonical storage (e.g., global install)
      // Preserve the original relative symlink target
      try {
        const linkTarget = fs.readlinkSync(srcPath)
        fs.symlinkSync(linkTarget, destPath)
      } catch {
        // Fallback: try dereferencing
        try {
          fs.cpSync(srcPath, destPath, { recursive: true, dereference: true })
        } catch {
          // Skip broken symlinks
        }
      }
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

  // Step 1: Copy canonical storage (.thought-cabinet/)
  let canonicalCopied = false
  if (fs.existsSync(sourceCanonicalDir)) {
    fs.cpSync(sourceCanonicalDir, targetCanonicalDir, { recursive: true })
    canonicalCopied = true
  }

  // Step 2: Detect and copy agent config directories
  const configDirs = detectAgentConfigDirs(sourceDir)

  for (const dirName of configDirs) {
    const sourcePath = path.join(sourceDir, dirName)
    const targetPath = path.join(targetDir, dirName)

    try {
      copyDirWithSymlinkHandling(sourcePath, targetPath, sourceCanonicalDir, targetCanonicalDir)
      copied.push(dirName)
    } catch {
      skipped.push(dirName)
    }
  }

  return { copied, skipped, canonicalCopied }
}
