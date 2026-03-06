// Core types
export type {
  AgentType,
  AgentConfig,
  Asset,
  InstallMode,
  InstallScope,
  InstallResult,
  AgentInitOptions,
} from './types.js'

// Constants
export type { AssetCategory } from './constants.js'
export { AGENTS_DIR, CATEGORY_SUBDIRS } from './constants.js'

// Agent registry
export {
  agents,
  getAgentConfig,
  getAllAgents,
  detectInstalledAgents,
  isValidAgentType,
} from './registry.js'

// Installer
export { sanitizeName, getAgentDir, installAssetForAgent } from './installer.js'

// Discovery
export {
  parseSkillFrontmatter,
  discoverSkills,
  discoverMarkdownAssets,
  discoverAllAssets,
} from './discovery.js'
