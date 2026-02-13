/**
 * Core initialization logic for thoughts directory setup.
 * This module contains reusable functions that can be called from both
 * the `thoughtcabinet init` command and `thc worktree add` command.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import {
  ResolvedProfileConfig,
  getRepoThoughtsPath,
  getGlobalThoughtsPath,
  updateSymlinksForNewUsers,
  expandPath,
} from './utils/index.js'
import {
  generateClaudeMd,
  generatePreCommitHook,
  generatePostCommitHook,
  HOOK_VERSION,
} from '../../templates/index.js'

export interface SetupThoughtsOptions {
  /** Code repository path */
  repoPath: string
  /** Resolved profile configuration */
  profileConfig: ResolvedProfileConfig
  /** Thoughts directory name in thoughts repo */
  mappedName: string
  /** Username */
  user: string
  /** Whether to create searchable directory */
  createSearchable?: boolean
  /** Whether to install git hooks */
  setupHooks?: boolean
}

export interface SetupThoughtsResult {
  thoughtsDir: string
  otherUsers: string[]
  hooksUpdated: string[]
}

/**
 * Set up thoughts directory structure and symlinks.
 * Can be reused by init command and worktree add.
 */
export function setupThoughtsDirectory(options: SetupThoughtsOptions): SetupThoughtsResult {
  const { repoPath, profileConfig, mappedName, user, createSearchable = false, setupHooks = false } = options
  
  const thoughtsDir = path.join(repoPath, 'thoughts')
  
  // Remove existing thoughts directory if present
  if (fs.existsSync(thoughtsDir)) {
    fs.rmSync(thoughtsDir, { recursive: true, force: true })
  }
  fs.mkdirSync(thoughtsDir)
  
  // Create symlinks
  const repoTarget = getRepoThoughtsPath(profileConfig, mappedName)
  const globalTarget = getGlobalThoughtsPath(profileConfig)
  
  // Direct symlinks to user and shared directories for repo-specific thoughts
  fs.symlinkSync(path.join(repoTarget, user), path.join(thoughtsDir, user), 'dir')
  fs.symlinkSync(path.join(repoTarget, 'shared'), path.join(thoughtsDir, 'shared'), 'dir')
  
  // Global directory
  fs.symlinkSync(globalTarget, path.join(thoughtsDir, 'global'), 'dir')
  
  // Check for other users and create symlinks
  const otherUsers = updateSymlinksForNewUsers(
    repoPath,
    profileConfig,
    mappedName,
    user,
  )
  
  // Generate CLAUDE.md
  const claudeMd = generateClaudeMd({
    thoughtsRepo: profileConfig.thoughtsRepo,
    reposDir: profileConfig.reposDir,
    repoName: mappedName,
    user: user,
  })
  fs.writeFileSync(path.join(thoughtsDir, 'CLAUDE.md'), claudeMd)
  
  // Setup git hooks if requested
  let hooksUpdated: string[] = []
  if (setupHooks) {
    const hookResult = setupGitHooks(repoPath)
    hooksUpdated = hookResult.updated
  }
  
  // Create searchable index if requested
  if (createSearchable) {
    createSearchableIndex(thoughtsDir)
  }
  
  return {
    thoughtsDir,
    otherUsers,
    hooksUpdated,
  }
}

/**
 * Set up git hooks (pre-commit, post-commit).
 * Extracted from init.ts setupGitHooks().
 */
export function setupGitHooks(repoPath: string): { updated: string[] } {
  const updated: string[] = []
  
  // Use git rev-parse to find the common git directory for hooks (handles worktrees)
  // In worktrees, hooks are stored in the common git directory, not the worktree-specific one
  let gitCommonDir: string
  try {
    gitCommonDir = execSync('git rev-parse --git-common-dir', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    // If the path is relative, make it absolute
    if (!path.isAbsolute(gitCommonDir)) {
      gitCommonDir = path.join(repoPath, gitCommonDir)
    }
  } catch (error) {
    throw new Error(`Failed to find git common directory: ${error}`)
  }

  const hooksDir = path.join(gitCommonDir, 'hooks')

  // Ensure hooks directory exists (might not exist in some setups)
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true })
  }

  // Pre-commit hook
  const preCommitPath = path.join(hooksDir, 'pre-commit')
  const preCommitContent = generatePreCommitHook({ hookPath: preCommitPath })

  // Post-commit hook
  const postCommitPath = path.join(hooksDir, 'post-commit')
  const postCommitContent = generatePostCommitHook({ hookPath: postCommitPath })

  // Helper to check if hook needs updating
  const hookNeedsUpdate = (hookPath: string): boolean => {
    if (!fs.existsSync(hookPath)) return true
    const content = fs.readFileSync(hookPath, 'utf8')
    if (!content.includes('ThoughtCabinet thoughts')) return false // Not our hook

    // Check version
    const versionMatch = content.match(/# Version: (\d+)/)
    if (!versionMatch) return true // Old hook without version

    const currentVersion = parseInt(versionMatch[1])
    return currentVersion < parseInt(HOOK_VERSION)
  }

  // Backup existing hooks if they exist and aren't ours (or need updating)
  if (fs.existsSync(preCommitPath)) {
    const content = fs.readFileSync(preCommitPath, 'utf8')
    if (!content.includes('ThoughtCabinet thoughts') || hookNeedsUpdate(preCommitPath)) {
      // Only backup non-ThoughtCabinet hooks to prevent recursion
      if (!content.includes('ThoughtCabinet thoughts')) {
        fs.renameSync(preCommitPath, `${preCommitPath}.old`)
      } else {
        // For outdated ThoughtCabinet hooks, just remove them
        fs.unlinkSync(preCommitPath)
      }
    }
  }

  if (fs.existsSync(postCommitPath)) {
    const content = fs.readFileSync(postCommitPath, 'utf8')
    if (!content.includes('ThoughtCabinet thoughts') || hookNeedsUpdate(postCommitPath)) {
      // Only backup non-ThoughtCabinet hooks to prevent recursion
      if (!content.includes('ThoughtCabinet thoughts')) {
        fs.renameSync(postCommitPath, `${postCommitPath}.old`)
      } else {
        // For outdated ThoughtCabinet hooks, just remove them
        fs.unlinkSync(postCommitPath)
      }
    }
  }

  // Write new hooks only if needed
  if (!fs.existsSync(preCommitPath) || hookNeedsUpdate(preCommitPath)) {
    fs.writeFileSync(preCommitPath, preCommitContent)
    fs.chmodSync(preCommitPath, '755')
    updated.push('pre-commit')
  }

  if (!fs.existsSync(postCommitPath) || hookNeedsUpdate(postCommitPath)) {
    fs.writeFileSync(postCommitPath, postCommitContent)
    fs.chmodSync(postCommitPath, '755')
    updated.push('post-commit')
  }

  return { updated }
}

/**
 * Create searchable directory with hard links.
 * Extracted from sync.ts createSearchDirectory().
 */
export function createSearchableIndex(thoughtsDir: string): number {
  const searchDir = path.join(thoughtsDir, 'searchable')
  
  // Remove existing searchable directory if it exists
  if (fs.existsSync(searchDir)) {
    fs.rmSync(searchDir, { recursive: true, force: true })
  }

  // Create new searchable directory
  fs.mkdirSync(searchDir, { recursive: true })

  // Function to recursively find all files through symlinks
  function findFilesFollowingSymlinks(
    dir: string,
    baseDir: string = dir,
    visited: Set<string> = new Set(),
  ): string[] {
    const files: string[] = []

    // Resolve symlinks to avoid cycles
    const realPath = fs.realpathSync(dir)
    if (visited.has(realPath)) {
      return files
    }
    visited.add(realPath)

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...findFilesFollowingSymlinks(fullPath, baseDir, visited))
      } else if (entry.isSymbolicLink() && !entry.name.startsWith('.')) {
        try {
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            files.push(...findFilesFollowingSymlinks(fullPath, baseDir, visited))
          } else if (stat.isFile() && path.basename(fullPath) !== 'CLAUDE.md') {
            files.push(path.relative(baseDir, fullPath))
          }
        } catch {
          // Ignore broken symlinks
        }
      } else if (entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'CLAUDE.md') {
        files.push(path.relative(baseDir, fullPath))
      }
    }

    return files
  }

  // Get all files accessible through the thoughts directory (following symlinks)
  const allFiles = findFilesFollowingSymlinks(thoughtsDir)

  // Create hard links in searchable directory
  let linkedCount = 0
  for (const relPath of allFiles) {
    const sourcePath = path.join(thoughtsDir, relPath)
    const targetPath = path.join(searchDir, relPath)

    // Create directory structure
    const targetDir = path.dirname(targetPath)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    try {
      // Resolve symlink to get the real file path
      const realSourcePath = fs.realpathSync(sourcePath)
      // Create hard link to the real file
      fs.linkSync(realSourcePath, targetPath)
      linkedCount++
    } catch {
      // Silently skip files we can't link (e.g., different filesystems)
    }
  }

  return linkedCount
}

/**
 * Pull latest thoughts from remote.
 * Extracted from init.ts.
 */
export function pullThoughtsFromRemote(thoughtsRepo: string): boolean {
  const expandedRepo = expandPath(thoughtsRepo)
  
  try {
    // Check if remote exists
    execSync('git remote get-url origin', { cwd: expandedRepo, stdio: 'pipe' })
    
    // Remote exists, try to pull
    try {
      execSync('git pull --rebase', {
        stdio: 'pipe',
        cwd: expandedRepo,
      })
      return true
    } catch {
      return false
    }
  } catch {
    // No remote configured, skip pull
    return false
  }
}
