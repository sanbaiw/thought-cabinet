import chalk from 'chalk'
import * as p from '@clack/prompts'
import { loadThoughtsConfig, saveThoughtsConfig } from '../utils/index.js'
import { validateProfile } from './utils.js'

interface DeleteOptions {
  force?: boolean
  configFile?: string
}

export async function profileDeleteCommand(
  profileName: string,
  options: DeleteOptions,
): Promise<void> {
  try {
    // Check for non-interactive mode
    if (!options.force && !process.stdin.isTTY) {
      p.log.error('Not running in interactive terminal.')
      p.log.info('Use --force flag to delete without confirmation.')
      process.exit(1)
    }

    p.intro(chalk.blue(`Delete Profile: ${profileName}`))

    const config = loadThoughtsConfig(options)

    if (!config) {
      p.log.error('Thoughts not configured.')
      process.exit(1)
    }

    if (!validateProfile(config, profileName)) {
      p.log.error(`Profile "${profileName}" not found.`)
      process.exit(1)
    }

    // Check if any repositories are using this profile
    const usingRepos: string[] = []
    Object.entries(config.repoMappings).forEach(([repoPath, mapping]) => {
      if (typeof mapping === 'object' && mapping.profile === profileName) {
        usingRepos.push(repoPath)
      }
    })

    if (usingRepos.length > 0 && !options.force) {
      p.log.error(`Profile "${profileName}" is in use by ${usingRepos.length} repository(ies):`)
      usingRepos.forEach(repo => {
        p.log.message(chalk.gray(`  - ${repo}`))
      })
      p.log.warn('Options:')
      p.log.message(chalk.gray('  1. Run "thoughtcabinet destroy" in each repository'))
      p.log.message(
        chalk.gray('  2. Use --force to delete anyway (repos will fall back to default config)'),
      )
      process.exit(1)
    }

    // Confirm deletion
    if (!options.force) {
      p.log.warn(`You are about to delete profile: ${chalk.cyan(profileName)}`)
      p.log.message(chalk.gray('This will remove the profile configuration.'))
      p.log.message(chalk.gray('The thoughts repository files will NOT be deleted.'))

      const confirmDelete = await p.confirm({
        message: `Delete profile "${profileName}"?`,
        initialValue: false,
      })

      if (p.isCancel(confirmDelete) || !confirmDelete) {
        p.cancel('Deletion cancelled.')
        return
      }
    }

    // Delete profile
    delete config.profiles![profileName]

    // If profiles is now empty, remove it entirely
    if (Object.keys(config.profiles!).length === 0) {
      delete config.profiles
    }

    // Save config
    saveThoughtsConfig(config, options)

    p.log.success(`Profile "${profileName}" deleted`)

    if (usingRepos.length > 0) {
      p.log.warn('Repositories using this profile will fall back to default config')
    }

    p.outro(chalk.green('Done'))
  } catch (error) {
    p.log.error(`Error deleting profile: ${error}`)
    process.exit(1)
  }
}
