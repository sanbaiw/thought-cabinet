import fs from 'fs'
import path from 'path'
import type { ResolvedProfileConfig } from './config.js'
import { getRepoThoughtsPath } from './paths.js'

// Overloaded signatures for updateSymlinksForNewUsers
export function updateSymlinksForNewUsers(
  currentRepoPath: string,
  config: ResolvedProfileConfig,
  repoName: string,
  currentUser: string,
): string[]
export function updateSymlinksForNewUsers(
  currentRepoPath: string,
  thoughtsRepo: string,
  reposDir: string,
  repoName: string,
  currentUser: string,
): string[]
export function updateSymlinksForNewUsers(
  currentRepoPath: string,
  configOrThoughtsRepo: ResolvedProfileConfig | string,
  reposDirOrRepoName: string,
  repoNameOrCurrentUser: string,
  currentUser?: string,
): string[] {
  let resolvedConfig: { thoughtsRepo: string; reposDir: string }
  let effectiveRepoName: string
  let effectiveUser: string

  if (typeof configOrThoughtsRepo === 'string') {
    // Legacy signature: (currentRepoPath, thoughtsRepo, reposDir, repoName, currentUser)
    resolvedConfig = {
      thoughtsRepo: configOrThoughtsRepo,
      reposDir: reposDirOrRepoName,
    }
    effectiveRepoName = repoNameOrCurrentUser
    effectiveUser = currentUser!
  } else {
    // New signature: (currentRepoPath, config, repoName, currentUser)
    resolvedConfig = configOrThoughtsRepo
    effectiveRepoName = reposDirOrRepoName
    effectiveUser = repoNameOrCurrentUser
  }

  const thoughtsDir = path.join(currentRepoPath, 'thoughts')
  const repoThoughtsPath = getRepoThoughtsPath(
    resolvedConfig.thoughtsRepo,
    resolvedConfig.reposDir,
    effectiveRepoName,
  )
  const addedSymlinks: string[] = []

  if (!fs.existsSync(thoughtsDir) || !fs.existsSync(repoThoughtsPath)) {
    return addedSymlinks
  }

  // Get all user directories in the repo thoughts
  const entries = fs.readdirSync(repoThoughtsPath, { withFileTypes: true })
  const userDirs = entries
    .filter(entry => entry.isDirectory() && entry.name !== 'shared' && !entry.name.startsWith('.'))
    .map(entry => entry.name)

  // Check each user directory and create symlinks if missing
  for (const userName of userDirs) {
    const symlinkPath = path.join(thoughtsDir, userName)
    const targetPath = path.join(repoThoughtsPath, userName)

    // Skip if symlink already exists or if it's the current user (already handled)
    if (!fs.existsSync(symlinkPath) && userName !== effectiveUser) {
      try {
        fs.symlinkSync(targetPath, symlinkPath, 'dir')
        addedSymlinks.push(userName)
      } catch {
        // Ignore errors - might be permission issues
      }
    }
  }

  return addedSymlinks
}
