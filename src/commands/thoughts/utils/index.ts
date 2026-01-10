// Config - types and load/save
export type { ThoughtsConfig, ResolvedProfileConfig } from './config.js'
export { loadThoughtsConfig, saveThoughtsConfig } from './config.js'

// Paths - path utilities
export {
  getDefaultThoughtsRepo,
  expandPath,
  getCurrentRepoPath,
  getRepoNameFromPath,
  getRepoThoughtsPath,
  getGlobalThoughtsPath,
  getMainRepoPath,
} from './paths.js'

// Repository - initialization and structure
export { ensureThoughtsRepoExists, createThoughtsDirectoryStructure } from './repository.js'

// Symlinks - symlink management
export { updateSymlinksForNewUsers } from './symlinks.js'

// Cleanup - thoughts directory cleanup
export { cleanupThoughtsDirectory } from './cleanup.js'
export type { CleanupThoughtsOptions, CleanupThoughtsResult } from './cleanup.js'
