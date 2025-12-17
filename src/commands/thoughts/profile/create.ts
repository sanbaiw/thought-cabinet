import chalk from 'chalk'
import * as p from '@clack/prompts'
import {
  loadThoughtsConfig,
  saveThoughtsConfig,
  getDefaultThoughtsRepo,
  ensureThoughtsRepoExists,
} from '../utils/index.js'
import { sanitizeProfileName, validateProfile } from './utils.js'
import type { ProfileConfig } from '../../../config'

interface CreateOptions {
  repo?: string
  reposDir?: string
  globalDir?: string
  configFile?: string
}

export async function profileCreateCommand(
  profileName: string,
  options: CreateOptions,
): Promise<void> {
  try {
    // Check for non-interactive mode
    if (!options.repo || !options.reposDir || !options.globalDir) {
      if (!process.stdin.isTTY) {
        p.log.error('Not running in interactive terminal.')
        p.log.info('Provide all options: --repo, --repos-dir, --global-dir')
        process.exit(1)
      }
    }

    // Load existing config
    const config = loadThoughtsConfig(options as Record<string, unknown>)

    if (!config) {
      p.log.error('Thoughts not configured.')
      p.log.info('Run "thoughtcabinet init" first to set up the base configuration.')
      process.exit(1)
    }

    // Sanitize profile name
    const sanitizedName = sanitizeProfileName(profileName)
    if (sanitizedName !== profileName) {
      p.log.warn(`Profile name sanitized: "${profileName}" → "${sanitizedName}"`)
    }

    p.intro(chalk.blue(`Creating Profile: ${sanitizedName}`))

    // Check if profile already exists
    if (validateProfile(config, sanitizedName)) {
      p.log.error(`Profile "${sanitizedName}" already exists.`)
      p.log.info('Use a different name or delete the existing profile first.')
      process.exit(1)
    }

    // Get profile configuration
    let thoughtsRepo: string
    let reposDir: string
    let globalDir: string

    if (options.repo && options.reposDir && options.globalDir) {
      // Non-interactive mode
      thoughtsRepo = options.repo
      reposDir = options.reposDir
      globalDir = options.globalDir
    } else {
      // Interactive mode
      const defaultRepo = getDefaultThoughtsRepo() + `-${sanitizedName}`
      p.log.info('Specify the thoughts repository location for this profile.')

      const repoInput = await p.text({
        message: 'Thoughts repository:',
        initialValue: defaultRepo,
        placeholder: defaultRepo,
      })

      if (p.isCancel(repoInput)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
      thoughtsRepo = (repoInput as string) || defaultRepo

      const reposDirInput = await p.text({
        message: 'Repository-specific thoughts directory:',
        initialValue: 'repos',
        placeholder: 'repos',
      })

      if (p.isCancel(reposDirInput)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
      reposDir = (reposDirInput as string) || 'repos'

      const globalDirInput = await p.text({
        message: 'Global thoughts directory:',
        initialValue: 'global',
        placeholder: 'global',
      })

      if (p.isCancel(globalDirInput)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
      globalDir = (globalDirInput as string) || 'global'
    }

    // Create profile config
    const profileConfig: ProfileConfig = {
      thoughtsRepo,
      reposDir,
      globalDir,
    }

    // Initialize profiles object if it doesn't exist
    if (!config.profiles) {
      config.profiles = {}
    }

    // Add profile
    config.profiles[sanitizedName] = profileConfig

    // Save config
    saveThoughtsConfig(config, options as Record<string, unknown>)

    // Create the profile's thoughts repository structure
    p.log.step('Initializing profile thoughts repository...')
    ensureThoughtsRepoExists(profileConfig)

    p.log.success(`Profile "${sanitizedName}" created successfully!`)

    p.note(
      `Name: ${chalk.cyan(sanitizedName)}\n` +
        `Thoughts repository: ${chalk.cyan(thoughtsRepo)}\n` +
        `Repos directory: ${chalk.cyan(reposDir)}\n` +
        `Global directory: ${chalk.cyan(globalDir)}`,
      'Profile Configuration',
    )

    p.outro(
      chalk.gray('Next steps:\n') +
        chalk.gray(`  1. Run "thoughtcabinet init --profile ${sanitizedName}" in a repository\n`) +
        chalk.gray(`  2. Your thoughts will sync to the profile's repository`),
    )
  } catch (error) {
    p.log.error(`Error creating profile: ${error}`)
    process.exit(1)
  }
}
