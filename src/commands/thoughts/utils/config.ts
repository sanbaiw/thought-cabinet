import { ConfigResolver, saveConfigFile } from '../../../config.js'
import type { RepoMappingObject, ProfileConfig } from '../../../config.js'

/**
 * Thoughts configuration interface
 */
export interface ThoughtsConfig {
  thoughtsRepo: string
  reposDir: string // Directory name within thoughtsRepo (e.g., "repos")
  globalDir: string // Directory name within thoughtsRepo (e.g., "global")
  user: string
  repoMappings: Record<string, string | RepoMappingObject>
  profiles?: Record<string, ProfileConfig>
  commitRepoPrefix?: boolean
}

/**
 * Resolved profile configuration interface
 */
export interface ResolvedProfileConfig {
  thoughtsRepo: string
  reposDir: string
  globalDir: string
  profileName?: string // undefined for default config
}

/**
 * Load thoughts configuration from config file
 */
export function loadThoughtsConfig(options: Record<string, unknown> = {}): ThoughtsConfig | null {
  const resolver = new ConfigResolver(options)
  return resolver.configFile.thoughts || null
}

/**
 * Save thoughts configuration to config file
 */
export function saveThoughtsConfig(
  thoughtsConfig: ThoughtsConfig,
  options: Record<string, unknown> = {},
): void {
  const resolver = new ConfigResolver(options)
  resolver.configFile.thoughts = thoughtsConfig
  saveConfigFile(resolver.configFile, options.configFile as string | undefined)
}
