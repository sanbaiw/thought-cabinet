import type { AssetCategory } from './constants.js'

/** Installation mode */
export type InstallMode = 'symlink' | 'copy'

/** Installation scope */
export type InstallScope = 'project' | 'global'

/** Supported agent identifiers */
export type AgentType = 'claude-code' | 'codebuddy' | 'cursor' | 'codex' | 'gemini-cli' | 'cline'

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
  /** Path where the asset was installed (agent-specific location) */
  path: string
  /** Path to canonical storage (if symlink mode) */
  canonicalPath?: string
  /** Which mode was used */
  mode: InstallMode
  /** True if symlink was attempted but fell back to copy */
  symlinkFailed?: boolean
  /** Error message if installation failed */
  error?: string
}

/** Options for the agent init command (will be used in Plan 2) */
export interface AgentInitOptions {
  /** Target agents to install to */
  agents?: AgentType[]
  /** Installation scope */
  scope?: InstallScope
  /** Installation mode */
  mode?: InstallMode
  /** Force overwrite existing installations */
  force?: boolean
  /** Non-interactive mode - install all assets */
  all?: boolean
  /** Max thinking tokens for settings */
  maxThinkingTokens?: number
  /** Source path to install from (defaults to bundled assets) */
  source?: string
}
