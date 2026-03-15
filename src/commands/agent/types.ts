import type { AssetCategory } from './constants.js'

/** Installation mode */
export type InstallMode = 'symlink' | 'copy'

/** Installation scope */
export type InstallScope = 'project' | 'global'

/** Supported agent identifiers */
export type AgentType = 'claude-code' | 'codebuddy'

/** Agent configuration - defines where an agent stores its assets */
export interface AgentConfig {
  name: AgentType
  displayName: string
  /** Relative path from project root for project-level assets (e.g., '.claude') */
  configDir: string
  /** Absolute path for global assets directory, undefined if agent doesn't support global */
  globalConfigDir: string | undefined
  /** Function to detect if this agent is installed on the system */
  detectInstalled: () => Promise<boolean>
}

/** A discoverable asset (skill, command, or agent config) from a local source */
export interface Asset {
  /** Asset name (from frontmatter for skills, or filename for commands/agents) */
  name: string
  /** Description (from frontmatter or empty) */
  description: string
  /** Absolute path to the asset source directory or file */
  sourcePath: string
  /** Which category this asset belongs to */
  category: AssetCategory
  /** Whether this is a directory (skills) or single file (commands/agents) */
  isDirectory: boolean
  /** Raw metadata from SKILL.md frontmatter (skills only) */
  metadata?: Record<string, unknown>
}

/** Result of an installation operation */
export interface InstallResult {
  success: boolean
  path: string
  /** Path to canonical storage (project-scope symlink mode only) */
  canonicalPath?: string
  mode: InstallMode
  /** True if symlink was attempted but fell back to copy */
  symlinkFailed?: boolean
  error?: string
}

/** Options for the agent init command */
export interface AgentInitOptions {
  agents?: AgentType[]
  scope?: InstallScope
  mode?: InstallMode
  force?: boolean
}
