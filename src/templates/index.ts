/**
 * Centralized exports for all template generators
 */

export { generateGitignore } from './gitignore.js'

export { generateRepoReadme, generateGlobalReadme } from './readme.js'
export type { RepoReadmeParams, GlobalReadmeParams } from './readme.js'

export { generateClaudeMd } from './claudeMd.js'
export type { ClaudeMdParams } from './claudeMd.js'

export { generatePreCommitHook, generatePostCommitHook, HOOK_VERSION } from './gitHooks.js'
export type { PreCommitHookParams, PostCommitHookParams } from './gitHooks.js'
