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
} from './paths.js'

// Repository - initialization and structure
export { ensureThoughtsRepoExists, createThoughtsDirectoryStructure } from './repository.js'

// Symlinks - symlink management
export { updateSymlinksForNewUsers } from './symlinks.js'
