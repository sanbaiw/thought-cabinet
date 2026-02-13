import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import type { ThoughtsConfig } from './config.js'
import { getRepoNameFromMapping, getProfileNameFromMapping } from '../profile/utils.js'

export interface CleanupThoughtsOptions {
  repoPath: string
  config: ThoughtsConfig
  force?: boolean
  verbose?: boolean
}

export interface CleanupThoughtsResult {
  thoughtsRemoved: boolean
  configRemoved: boolean
  mappedName?: string
  profileName?: string
}

/**
 * Clean up thoughts directory and configuration for a repository
 * Returns information about what was cleaned up
 */
export function cleanupThoughtsDirectory({
  repoPath,
  config,
  force = false,
  verbose = true,
}: CleanupThoughtsOptions): CleanupThoughtsResult {
  const thoughtsDir = path.join(repoPath, 'thoughts')
  const result: CleanupThoughtsResult = {
    thoughtsRemoved: false,
    configRemoved: false,
  }

  // Check if thoughts directory exists
  if (!fs.existsSync(thoughtsDir)) {
    return result
  }

  const mapping = config.repoMappings[repoPath]
  const mappedName = getRepoNameFromMapping(mapping)
  const profileName = getProfileNameFromMapping(mapping)

  result.mappedName = mappedName
  result.profileName = profileName

  // Validate mapping unless force is specified
  if (!mappedName && !force) {
    return result
  }

  // Step 1: Remove searchable directory if it exists
  const searchableDir = path.join(thoughtsDir, 'searchable')
  if (fs.existsSync(searchableDir)) {
    if (verbose) {
      console.log(chalk.gray('Removing searchable directory...'))
    }
    fs.rmSync(searchableDir, { recursive: true, force: true })
  }

  // Step 2: Remove the entire thoughts directory
  if (verbose) {
    console.log(chalk.gray('Removing thoughts directory...'))
  }
  try {
    fs.rmSync(thoughtsDir, { recursive: true, force: true })
    result.thoughtsRemoved = true
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`Error removing thoughts directory: ${error}`))
    }
    throw error
  }

  // Step 3: Remove from config if mapped
  if (mappedName) {
    if (verbose) {
      console.log(chalk.gray('Removing repository from thoughts configuration...'))
    }
    delete config.repoMappings[repoPath]
    result.configRemoved = true
  }

  return result
}
