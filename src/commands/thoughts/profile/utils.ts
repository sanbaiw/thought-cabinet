import type { RepoMappingObject } from '../../../config.js'
import type { ThoughtsConfig, ResolvedProfileConfig } from '../utils/config.js'

/**
 * Resolves the profile config for a given repository path
 * Returns default config if no profile specified or profile not found
 */
export function resolveProfileForRepo(
  config: ThoughtsConfig,
  repoPath: string,
): ResolvedProfileConfig {
  const mapping = config.repoMappings[repoPath]

  // Handle string format (legacy - no profile)
  if (typeof mapping === 'string') {
    return {
      thoughtsRepo: config.thoughtsRepo,
      reposDir: config.reposDir,
      globalDir: config.globalDir,
      profileName: undefined,
    }
  }

  // Handle object format
  if (mapping && typeof mapping === 'object') {
    const profileName = mapping.profile

    // If profile specified, look it up
    if (profileName && config.profiles && config.profiles[profileName]) {
      const profile = config.profiles[profileName]
      return {
        thoughtsRepo: profile.thoughtsRepo,
        reposDir: profile.reposDir,
        globalDir: profile.globalDir,
        profileName,
      }
    }

    // Object format but no profile or profile not found - use default
    return {
      thoughtsRepo: config.thoughtsRepo,
      reposDir: config.reposDir,
      globalDir: config.globalDir,
      profileName: undefined,
    }
  }

  // No mapping - use default
  return {
    thoughtsRepo: config.thoughtsRepo,
    reposDir: config.reposDir,
    globalDir: config.globalDir,
    profileName: undefined,
  }
}

/**
 * Gets the repo name from a mapping (handles both string and object formats)
 */
export function getRepoNameFromMapping(
  mapping: string | RepoMappingObject | undefined,
): string | undefined {
  if (!mapping) return undefined
  if (typeof mapping === 'string') return mapping
  return mapping.repo
}

/**
 * Gets the profile name from a mapping (returns undefined for string format)
 */
export function getProfileNameFromMapping(
  mapping: string | RepoMappingObject | undefined,
): string | undefined {
  if (!mapping) return undefined
  if (typeof mapping === 'string') return undefined
  return mapping.profile
}

/**
 * Validates that a profile exists in the configuration
 */
export function validateProfile(config: ThoughtsConfig, profileName: string): boolean {
  return !!(config.profiles && config.profiles[profileName])
}

/**
 * Sanitizes profile name (same rules as directory names)
 */
export function sanitizeProfileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}
