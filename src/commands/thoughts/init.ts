import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  ThoughtsConfig,
  loadThoughtsConfig,
  saveThoughtsConfig,
  getDefaultThoughtsRepo,
  ensureThoughtsRepoExists,
  createThoughtsDirectoryStructure,
  getCurrentRepoPath,
  getRepoNameFromPath,
  expandPath,
  getRepoThoughtsPath,
  getGlobalThoughtsPath,
  updateSymlinksForNewUsers,
} from './utils/index.js'
import { validateProfile, resolveProfileForRepo, getRepoNameFromMapping } from './profile/utils.js'
import {
  generateClaudeMd,
  generatePreCommitHook,
  generatePostCommitHook,
  HOOK_VERSION,
} from '../../templates/index.js'

interface InitOptions {
  force?: boolean
  configFile?: string
  directory?: string
  profile?: string
}

function sanitizeDirectoryName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function checkExistingSetup(config?: ThoughtsConfig | null): {
  exists: boolean
  isValid: boolean
  message?: string
} {
  const thoughtsDir = path.join(process.cwd(), 'thoughts')

  if (!fs.existsSync(thoughtsDir)) {
    return { exists: false, isValid: false }
  }

  // Check if it's a directory
  if (!fs.lstatSync(thoughtsDir).isDirectory()) {
    return { exists: true, isValid: false, message: 'thoughts exists but is not a directory' }
  }

  // Need config to check for user-specific symlinks
  if (!config) {
    return {
      exists: true,
      isValid: false,
      message: 'thoughts directory exists but configuration is missing',
    }
  }

  // Check for expected symlinks in new structure
  const userPath = path.join(thoughtsDir, config.user)
  const sharedPath = path.join(thoughtsDir, 'shared')
  const globalPath = path.join(thoughtsDir, 'global')

  const hasUser = fs.existsSync(userPath) && fs.lstatSync(userPath).isSymbolicLink()
  const hasShared = fs.existsSync(sharedPath) && fs.lstatSync(sharedPath).isSymbolicLink()
  const hasGlobal = fs.existsSync(globalPath) && fs.lstatSync(globalPath).isSymbolicLink()

  if (!hasUser || !hasShared || !hasGlobal) {
    return {
      exists: true,
      isValid: false,
      message: 'thoughts directory exists but symlinks are missing or broken',
    }
  }

  return { exists: true, isValid: true }
}

function setupGitHooks(repoPath: string): { updated: string[] } {
  const updated: string[] = []
  // Use git rev-parse to find the common git directory for hooks (handles worktrees)
  // In worktrees, hooks are stored in the common git directory, not the worktree-specific one
  let gitCommonDir: string
  try {
    gitCommonDir = execSync('git rev-parse --git-common-dir', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    // If the path is relative, make it absolute
    if (!path.isAbsolute(gitCommonDir)) {
      gitCommonDir = path.join(repoPath, gitCommonDir)
    }
  } catch (error) {
    throw new Error(`Failed to find git common directory: ${error}`)
  }

  const hooksDir = path.join(gitCommonDir, 'hooks')

  // Ensure hooks directory exists (might not exist in some setups)
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true })
  }

  // Pre-commit hook
  const preCommitPath = path.join(hooksDir, 'pre-commit')
  const preCommitContent = generatePreCommitHook({ hookPath: preCommitPath })

  // Post-commit hook
  const postCommitPath = path.join(hooksDir, 'post-commit')
  const postCommitContent = generatePostCommitHook({ hookPath: postCommitPath })

  // Helper to check if hook needs updating
  const hookNeedsUpdate = (hookPath: string): boolean => {
    if (!fs.existsSync(hookPath)) return true
    const content = fs.readFileSync(hookPath, 'utf8')
    if (!content.includes('ThoughtCabinet thoughts')) return false // Not our hook

    // Check version
    const versionMatch = content.match(/# Version: (\d+)/)
    if (!versionMatch) return true // Old hook without version

    const currentVersion = parseInt(versionMatch[1])
    return currentVersion < parseInt(HOOK_VERSION)
  }

  // Backup existing hooks if they exist and aren't ours (or need updating)
  if (fs.existsSync(preCommitPath)) {
    const content = fs.readFileSync(preCommitPath, 'utf8')
    if (!content.includes('ThoughtCabinet thoughts') || hookNeedsUpdate(preCommitPath)) {
      // Only backup non-ThoughtCabinet hooks to prevent recursion
      if (!content.includes('ThoughtCabinet thoughts')) {
        fs.renameSync(preCommitPath, `${preCommitPath}.old`)
      } else {
        // For outdated ThoughtCabinet hooks, just remove them
        fs.unlinkSync(preCommitPath)
      }
    }
  }

  if (fs.existsSync(postCommitPath)) {
    const content = fs.readFileSync(postCommitPath, 'utf8')
    if (!content.includes('ThoughtCabinet thoughts') || hookNeedsUpdate(postCommitPath)) {
      // Only backup non-ThoughtCabinet hooks to prevent recursion
      if (!content.includes('ThoughtCabinet thoughts')) {
        fs.renameSync(postCommitPath, `${postCommitPath}.old`)
      } else {
        // For outdated ThoughtCabinet hooks, just remove them
        fs.unlinkSync(postCommitPath)
      }
    }
  }

  // Write new hooks only if needed
  if (!fs.existsSync(preCommitPath) || hookNeedsUpdate(preCommitPath)) {
    fs.writeFileSync(preCommitPath, preCommitContent)
    fs.chmodSync(preCommitPath, '755')
    updated.push('pre-commit')
  }

  if (!fs.existsSync(postCommitPath) || hookNeedsUpdate(postCommitPath)) {
    fs.writeFileSync(postCommitPath, postCommitContent)
    fs.chmodSync(postCommitPath, '755')
    updated.push('post-commit')
  }

  return { updated }
}

export async function thoughtsInitCommand(options: InitOptions): Promise<void> {
  try {
    // Check for interactive mode when needed
    if (!options.directory && !process.stdin.isTTY) {
      p.log.error('Not running in interactive terminal.')
      p.log.info('Use --directory flag to specify the repository directory name.')
      process.exit(1)
    }

    const currentRepo = getCurrentRepoPath()

    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' })
    } catch {
      p.log.error('Not in a git repository')
      process.exit(1)
    }

    // Load or create global config first
    let config = loadThoughtsConfig(options)

    // If no config exists, we need to set it up first
    if (!config) {
      p.intro(chalk.blue('Initial Thoughts Setup'))

      p.log.info("First, let's configure your global thoughts system.")

      // Get thoughts repository location
      const defaultRepo = getDefaultThoughtsRepo()
      p.log.message(
        chalk.gray('This is where all your thoughts across all projects will be stored.'),
      )

      const thoughtsRepoInput = await p.text({
        message: 'Thoughts repository location:',
        initialValue: defaultRepo,
        placeholder: defaultRepo,
      })

      if (p.isCancel(thoughtsRepoInput)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
      const thoughtsRepo = (thoughtsRepoInput as string) || defaultRepo

      // Get directory names
      p.log.message(chalk.gray('Your thoughts will be organized into two main directories:'))
      p.log.message(chalk.gray('- Repository-specific thoughts (one subdirectory per project)'))
      p.log.message(chalk.gray('- Global thoughts (shared across all projects)'))

      const reposDirInput = await p.text({
        message: 'Directory name for repository-specific thoughts:',
        initialValue: 'repos',
        placeholder: 'repos',
      })

      if (p.isCancel(reposDirInput)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
      const reposDir = (reposDirInput as string) || 'repos'

      const globalDirInput = await p.text({
        message: 'Directory name for global thoughts:',
        initialValue: 'global',
        placeholder: 'global',
      })

      if (p.isCancel(globalDirInput)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
      const globalDir = (globalDirInput as string) || 'global'

      // Get user name
      const defaultUser = process.env.USER || 'user'
      let user = ''
      while (!user || user.toLowerCase() === 'global') {
        const userInput = await p.text({
          message: 'Your username:',
          initialValue: defaultUser,
          placeholder: defaultUser,
          validate: value => {
            if (value.toLowerCase() === 'global') {
              return 'Username cannot be "global" as it\'s reserved for cross-project thoughts.'
            }
            return undefined
          },
        })

        if (p.isCancel(userInput)) {
          p.cancel('Operation cancelled.')
          process.exit(0)
        }
        user = (userInput as string) || defaultUser
      }

      config = {
        thoughtsRepo,
        reposDir,
        globalDir,
        user,
        repoMappings: {},
      }

      // Show what will be created
      p.note(
        `${chalk.cyan(thoughtsRepo)}/\n` +
          `  ├── ${chalk.cyan(reposDir)}/     ${chalk.gray('(project-specific thoughts)')}\n` +
          `  └── ${chalk.cyan(globalDir)}/    ${chalk.gray('(cross-project thoughts)')}`,
        'Creating thoughts structure',
      )

      // Ensure thoughts repo exists
      ensureThoughtsRepoExists(thoughtsRepo, reposDir, globalDir)

      // Save initial config
      saveThoughtsConfig(config, options)
      p.log.success('Global thoughts configuration created')
    }

    // Validate profile if specified
    if (options.profile) {
      if (!validateProfile(config, options.profile)) {
        p.log.error(`Profile "${options.profile}" does not exist.`)
        p.log.message(chalk.gray('Available profiles:'))
        if (config.profiles) {
          Object.keys(config.profiles).forEach(name => {
            p.log.message(chalk.gray(`  - ${name}`))
          })
        } else {
          p.log.message(chalk.gray('  (none)'))
        }
        p.log.warn('Create a profile first:')
        p.log.message(chalk.gray(`  thoughtcabinet profile create ${options.profile}`))
        process.exit(1)
      }
    }

    // Resolve profile config early so we use the right thoughtsRepo throughout
    // Create a temporary mapping to resolve the profile (will be updated later with actual mapping)
    const tempProfileConfig =
      options.profile && config.profiles && config.profiles[options.profile]
        ? {
            thoughtsRepo: config.profiles[options.profile].thoughtsRepo,
            reposDir: config.profiles[options.profile].reposDir,
            globalDir: config.profiles[options.profile].globalDir,
            profileName: options.profile,
          }
        : {
            thoughtsRepo: config.thoughtsRepo,
            reposDir: config.reposDir,
            globalDir: config.globalDir,
            profileName: undefined,
          }

    // Now check for existing setup in current repo
    const setupStatus = checkExistingSetup(config)

    if (setupStatus.exists && !options.force) {
      if (setupStatus.isValid) {
        p.log.warn('Thoughts directory already configured for this repository.')

        const reconfigure = await p.confirm({
          message: 'Do you want to reconfigure?',
          initialValue: false,
        })

        if (p.isCancel(reconfigure) || !reconfigure) {
          p.cancel('Setup cancelled.')
          return
        }
      } else {
        p.log.warn(setupStatus.message || 'Thoughts setup is incomplete')

        const fix = await p.confirm({
          message: 'Do you want to fix the setup?',
          initialValue: true,
        })

        if (p.isCancel(fix) || !fix) {
          p.cancel('Setup cancelled.')
          return
        }
      }
    }

    // Ensure thoughts repo still exists (might have been deleted)
    const expandedRepo = expandPath(tempProfileConfig.thoughtsRepo)
    if (!fs.existsSync(expandedRepo)) {
      p.log.error(`Thoughts repository not found at ${tempProfileConfig.thoughtsRepo}`)
      p.log.warn('The thoughts repository may have been moved or deleted.')

      const recreate = await p.confirm({
        message: 'Do you want to recreate it?',
        initialValue: true,
      })

      if (p.isCancel(recreate) || !recreate) {
        p.log.info('Please update your configuration or restore the thoughts repository.')
        process.exit(1)
      }
      ensureThoughtsRepoExists(
        tempProfileConfig.thoughtsRepo,
        tempProfileConfig.reposDir,
        tempProfileConfig.globalDir,
      )
    }

    // Map current repository
    const reposDir = path.join(expandedRepo, tempProfileConfig.reposDir)

    // Ensure repos directory exists
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true })
    }

    // Get existing repo directories
    const existingRepos = fs.readdirSync(reposDir).filter(name => {
      const fullPath = path.join(reposDir, name)
      return fs.statSync(fullPath).isDirectory() && !name.startsWith('.')
    })

    // Check if current repo is already mapped
    const existingMapping = config.repoMappings[currentRepo]
    let mappedName = getRepoNameFromMapping(existingMapping)

    if (!mappedName) {
      if (options.directory) {
        // Non-interactive mode with --directory option
        const sanitizedDir = sanitizeDirectoryName(options.directory)

        if (!existingRepos.includes(sanitizedDir)) {
          p.log.error(`Directory "${sanitizedDir}" not found in thoughts repository.`)
          p.log.error('In non-interactive mode (--directory), you must specify a directory')
          p.log.error('name that already exists in the thoughts repository.')
          p.log.warn('Available directories:')
          existingRepos.forEach(repo => p.log.message(chalk.gray(`  - ${repo}`)))
          process.exit(1)
        }

        mappedName = sanitizedDir
        p.log.success(
          `Using existing: ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/${mappedName}`,
        )
      } else {
        // Interactive mode
        p.intro(chalk.blue('Repository Setup'))

        p.log.info(`Setting up thoughts for: ${chalk.cyan(currentRepo)}`)
        p.log.message(
          chalk.gray(
            `This will create a subdirectory in ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/`,
          ),
        )
        p.log.message(chalk.gray('to store thoughts specific to this repository.'))

        if (existingRepos.length > 0) {
          const selectOptions = [
            ...existingRepos.map(repo => ({ value: repo, label: `Use existing: ${repo}` })),
            { value: '__create_new__', label: 'Create new directory' },
          ]

          const selection = await p.select({
            message: 'Select or create a thoughts directory for this repository:',
            options: selectOptions,
          })

          if (p.isCancel(selection)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
          }

          if (selection === '__create_new__') {
            // Create new
            const defaultName = getRepoNameFromPath(currentRepo)
            p.log.message(
              chalk.gray(
                `This name will be used for the directory: ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/[name]`,
              ),
            )

            const nameInput = await p.text({
              message: "Directory name for this project's thoughts:",
              initialValue: defaultName,
              placeholder: defaultName,
            })

            if (p.isCancel(nameInput)) {
              p.cancel('Operation cancelled.')
              process.exit(0)
            }
            mappedName = (nameInput as string) || defaultName

            // Sanitize the name
            mappedName = sanitizeDirectoryName(mappedName)
            p.log.success(
              `Will create: ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/${mappedName}`,
            )
          } else {
            mappedName = selection as string
            p.log.success(
              `Will use existing: ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/${mappedName}`,
            )
          }
        } else {
          // No existing repos, just create new
          const defaultName = getRepoNameFromPath(currentRepo)
          p.log.message(
            chalk.gray(
              `This name will be used for the directory: ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/[name]`,
            ),
          )

          const nameInput = await p.text({
            message: "Directory name for this project's thoughts:",
            initialValue: defaultName,
            placeholder: defaultName,
          })

          if (p.isCancel(nameInput)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
          }
          mappedName = (nameInput as string) || defaultName

          // Sanitize the name
          mappedName = sanitizeDirectoryName(mappedName)
          p.log.success(
            `Will create: ${tempProfileConfig.thoughtsRepo}/${tempProfileConfig.reposDir}/${mappedName}`,
          )
        }
      }

      // Update config with profile-aware mapping
      if (options.profile) {
        config.repoMappings[currentRepo] = {
          repo: mappedName,
          profile: options.profile,
        }
      } else {
        // Keep string format for backward compatibility
        config.repoMappings[currentRepo] = mappedName
      }
      saveThoughtsConfig(config, options)
    }

    // Ensure mappedName is resolved when mapping already existed
    if (!mappedName) {
      mappedName = getRepoNameFromMapping(config.repoMappings[currentRepo])!
    }

    // Resolve profile config for directory creation
    const profileConfig = resolveProfileForRepo(config, currentRepo)

    // Create directory structure using profile config
    createThoughtsDirectoryStructure(profileConfig, mappedName, config.user)

    // Create thoughts directory in current repo
    const thoughtsDir = path.join(currentRepo, 'thoughts')
    if (fs.existsSync(thoughtsDir)) {
      // Handle searchable directories specially if they exist (might have read-only permissions)
      const searchableDir = path.join(thoughtsDir, 'searchable')
      if (fs.existsSync(searchableDir)) {
        try {
          // Reset permissions so we can delete it
          execSync(`chmod -R 755 "${searchableDir}"`, { stdio: 'pipe' })
        } catch {
          // Ignore chmod errors
        }
      }
      fs.rmSync(thoughtsDir, { recursive: true, force: true })
    }
    fs.mkdirSync(thoughtsDir)

    // Create symlinks - flipped structure for easier access
    const repoTarget = getRepoThoughtsPath(profileConfig, mappedName)
    const globalTarget = getGlobalThoughtsPath(profileConfig)

    // Direct symlinks to user and shared directories for repo-specific thoughts
    fs.symlinkSync(path.join(repoTarget, config.user), path.join(thoughtsDir, config.user), 'dir')
    fs.symlinkSync(path.join(repoTarget, 'shared'), path.join(thoughtsDir, 'shared'), 'dir')

    // Global directory as before
    fs.symlinkSync(globalTarget, path.join(thoughtsDir, 'global'), 'dir')

    // Check for other users and create symlinks
    const otherUsers = updateSymlinksForNewUsers(
      currentRepo,
      profileConfig,
      mappedName,
      config.user,
    )

    if (otherUsers.length > 0) {
      p.log.success(`Added symlinks for other users: ${otherUsers.join(', ')}`)
    }

    // Pull latest thoughts if remote exists
    try {
      execSync('git remote get-url origin', { cwd: expandedRepo, stdio: 'pipe' })
      // Remote exists, try to pull
      try {
        execSync('git pull --rebase', {
          stdio: 'pipe',
          cwd: expandedRepo,
        })
        p.log.success('Pulled latest thoughts from remote')
      } catch (error) {
        p.log.warn(`Could not pull latest thoughts: ${(error as Error).message}`)
      }
    } catch {
      // No remote configured, skip pull
    }

    // Generate CLAUDE.md
    const claudeMd = generateClaudeMd({
      thoughtsRepo: profileConfig.thoughtsRepo,
      reposDir: profileConfig.reposDir,
      repoName: mappedName,
      user: config.user,
    })
    fs.writeFileSync(path.join(thoughtsDir, 'CLAUDE.md'), claudeMd)

    // Setup git hooks
    const hookResult = setupGitHooks(currentRepo)
    if (hookResult.updated.length > 0) {
      p.log.step(`Updated git hooks: ${hookResult.updated.join(', ')}`)
    }

    p.log.success('Thoughts setup complete!')

    // Summary note
    const structureText =
      `${chalk.cyan(currentRepo)}/\n` +
      `  └── thoughts/\n` +
      `       ├── ${config.user}/     ${chalk.gray(`→ ${profileConfig.thoughtsRepo}/${profileConfig.reposDir}/${mappedName}/${config.user}/`)}\n` +
      `       ├── shared/      ${chalk.gray(`→ ${profileConfig.thoughtsRepo}/${profileConfig.reposDir}/${mappedName}/shared/`)}\n` +
      `       └── global/      ${chalk.gray(`→ ${profileConfig.thoughtsRepo}/${profileConfig.globalDir}/`)}\n` +
      `           ├── ${config.user}/     ${chalk.gray('(your cross-repo notes)')}\n` +
      `           └── shared/  ${chalk.gray('(team cross-repo notes)')}`

    p.note(structureText, 'Repository structure created')

    p.note(
      `${chalk.green('✓')} Pre-commit hook: Prevents committing thoughts/\n` +
        `${chalk.green('✓')} Post-commit hook: Auto-syncs thoughts after commits`,
      'Protection enabled',
    )

    p.outro(
      chalk.gray('Next steps:\n') +
        chalk.gray(
          `  1. Run ${chalk.cyan('thoughtcabinet sync')} to create the searchable index\n`,
        ) +
        chalk.gray(
          `  2. Create markdown files in ${chalk.cyan(`thoughts/${config.user}/`)} for your notes\n`,
        ) +
        chalk.gray(`  3. Your thoughts will sync automatically when you commit code\n`) +
        chalk.gray(`  4. Run ${chalk.cyan('thoughtcabinet status')} to check sync status`),
    )
  } catch (error) {
    p.log.error(`Error during thoughts init: ${error}`)
    process.exit(1)
  }
}
