/**
 * Centralized exports for all template generators
 */

export { generateGitignore } from './gitignore.js'

export { generateRepoReadme, generateGlobalReadme } from './readme.js'
export type { RepoReadmeParams, GlobalReadmeParams } from './readme.js'

export { generateClaudeMd, generateCodebuddyMd, generateAgentMd } from './agentMd.js'
export type { ClaudeMdParams, AgentMdParams } from './agentMd.js'

export { generatePreCommitHook, generatePostCommitHook, HOOK_VERSION } from './gitHooks.js'
export type { PreCommitHookParams, PostCommitHookParams } from './gitHooks.js'
