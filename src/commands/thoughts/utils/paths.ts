import path from 'path'
import os from 'os'
import type { ResolvedProfileConfig } from './config.js'

// Re-export getMainRepoPath from git module for backward compatibility
export { getMainRepoPath } from '../../../git.js'

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

