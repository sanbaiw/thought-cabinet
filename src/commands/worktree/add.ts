import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import {
  isGitRepo,
  validateWorktreeHandle,
  getMainWorktreeRoot,
  getWorktreesBaseDir,
  setBranchBase,
  runGitCommandOrThrow,
} from '../../git.js'
import {
  sessionNameForHandle,
  allSessionNamesForHandle,
  tmuxHasSession,
  tmuxNewSession,
} from '../../tmux.js'
import { copyAgentConfigDirs } from '../../agent-config.js'
import {
  loadThoughtsConfig,
  saveThoughtsConfig,
  createThoughtsDirectoryStructure,
} from '../thoughts/utils/index.js'
import { setupThoughtsDirectory, pullThoughtsFromRemote } from '../thoughts/init-core.js'
import { resolveProfileForRepo, getRepoNameFromMapping } from '../thoughts/profile/utils.js'
import { loadHooksConfig, getHooksForEvent, executeHooks } from '../../hooks/index.js'
import type { WorktreeAddOptions } from './utils.js'

export async function worktreeAddCommand(name: string, options: WorktreeAddOptions): Promise<void> {
  try {
    validateWorktreeHandle(name)

    if (!isGitRepo()) {
      console.error(chalk.red('Error: not in a git repository'))
      process.exit(1)
    }

    const mainRoot = getMainWorktreeRoot()
    const baseDir = getWorktreesBaseDir(mainRoot)
    const worktreePath = options.path ? path.resolve(options.path) : path.join(baseDir, name)
    const branch = options.detached ? '' : (options.branch ?? name)
    const sessionName = sessionNameForHandle(name)

    fs.mkdirSync(path.dirname(worktreePath), { recursive: true })

    const sessionCandidates = allSessionNamesForHandle(name)
    const existingSession = sessionCandidates.find(s => tmuxHasSession(s))
    if (existingSession) {
      console.error(chalk.red(`Error: tmux session already exists: ${existingSession}`))
      process.exit(1)
    }

    // Execute PreWorktreeAdd hooks
    const hooksConfig = loadHooksConfig(mainRoot)
    const preAddHooks = getHooksForEvent(hooksConfig, 'PreWorktreeAdd')

    if (preAddHooks.length > 0) {
      const hookEnv = {
        THC_WORKTREE_PATH: worktreePath,
        THC_WORKTREE_NAME: name,
        THC_WORKTREE_BRANCH: branch,
        THC_MAIN_ROOT: mainRoot,
        THC_SESSION_NAME: sessionName,
        THC_BASE_REF: options.base,
      }

      await executeHooks(
        preAddHooks,
        {
          hook_event_name: 'PreWorktreeAdd',
          cwd: mainRoot,
          worktree_path: worktreePath,
          worktree_name: name,
          worktree_branch: branch,
          main_root: mainRoot,
          session_name: sessionName,
          base_ref: options.base,
        },
        hookEnv,
        true,
      )
    }

    if (options.detached) {
      runGitCommandOrThrow(['worktree', 'add', '--detach', worktreePath, options.base], {
        cwd: mainRoot,
      })
    } else {
      runGitCommandOrThrow(['worktree', 'add', '-b', branch, worktreePath, options.base], {
        cwd: mainRoot,
      })
      setBranchBase(branch, options.base, worktreePath)
    }

    tmuxNewSession(sessionName, worktreePath)

    // Copy agent configuration directories
    const configResult = copyAgentConfigDirs({
      sourceDir: mainRoot,
      targetDir: worktreePath,
    })
    if (configResult.copied.length > 0) {
      console.log(chalk.gray(`Copied config: ${configResult.copied.join(', ')}`))
    }

    // Initialize thoughts (unless --no-thoughts is specified)
    if (options.thoughts !== false) {
      initializeWorktreeThoughts(mainRoot, worktreePath)
    }

    // Execute PostWorktreeAdd hooks
    const postAddHooks = getHooksForEvent(hooksConfig, 'PostWorktreeAdd')

    if (postAddHooks.length > 0) {
      const hookEnv = {
        THC_WORKTREE_PATH: worktreePath,
        THC_WORKTREE_NAME: name,
        THC_WORKTREE_BRANCH: branch,
        THC_MAIN_ROOT: mainRoot,
        THC_SESSION_NAME: sessionName,
      }

      await executeHooks(
        postAddHooks,
        {
          hook_event_name: 'PostWorktreeAdd',
          cwd: worktreePath,
          worktree_path: worktreePath,
          worktree_name: name,
          worktree_branch: branch,
          main_root: mainRoot,
          session_name: sessionName,
        },
        hookEnv,
        true,
      )
    }

    console.log(chalk.green('\n✓ Worktree created'))
    console.log(chalk.gray(`Path: ${worktreePath}`))
    console.log(chalk.gray(`Tmux session: ${sessionName}`))
    console.log(chalk.gray(`Attach: tmux attach -t ${sessionName}`))
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`))
    process.exit(1)
  }
}

function initializeWorktreeThoughts(mainRoot: string, worktreePath: string): void {
  const config = loadThoughtsConfig({})
  if (!config) {
    console.log(chalk.yellow('Thoughts not configured globally, skipping'))
    return
  }

  const mainRepoMapping = config.repoMappings[mainRoot]
  const mappedName = getRepoNameFromMapping(mainRepoMapping)

  if (!mappedName) {
    console.log(chalk.yellow('Main repo not configured for thoughts, skipping'))
    return
  }

  // Add repo mapping for new worktree
  config.repoMappings[worktreePath] = mainRepoMapping
  saveThoughtsConfig(config, {})

  const profileConfig = resolveProfileForRepo(config, worktreePath)

  // Ensure the thoughts directory structure exists in thoughts repo
  createThoughtsDirectoryStructure(profileConfig, mappedName, config.user)

  // Set up thoughts directory
  const result = setupThoughtsDirectory({
    repoPath: worktreePath,
    profileConfig,
    mappedName,
    user: config.user,
    createSearchable: true,
    setupHooks: true,
  })

  console.log(chalk.gray('Thoughts initialized'))
  if (result.hooksUpdated.length > 0) {
    console.log(chalk.gray(`Updated git hooks: ${result.hooksUpdated.join(', ')}`))
  }

  // Sync thoughts from remote
  if (pullThoughtsFromRemote(profileConfig.thoughtsRepo)) {
    console.log(chalk.gray('Pulled latest thoughts from remote'))
  }
}
