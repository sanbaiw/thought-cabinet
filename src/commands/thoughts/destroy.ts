import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import {
  loadThoughtsConfig,
  saveThoughtsConfig,
  getCurrentRepoPath,
  cleanupThoughtsDirectory,
} from './utils/index.js'
import { loadHooksConfig, getHooksForEvent, executeHooks } from '../../hooks/index.js'

interface DestoryOptions {
  force?: boolean
  configFile?: string
}

export async function thoughtsDestoryCommand(options: DestoryOptions): Promise<void> {
  try {
    const currentRepo = getCurrentRepoPath()
    const thoughtsDir = path.join(currentRepo, 'thoughts')

    // Check if thoughts directory exists
    if (!fs.existsSync(thoughtsDir)) {
      console.error(chalk.red('Error: Thoughts not initialized for this repository.'))
      process.exit(1)
    }

    // Load config
    const config = loadThoughtsConfig(options)
    if (!config) {
      console.error(chalk.red('Error: Thoughts configuration not found.'))
      process.exit(1)
    }

    // Check if repository is in config (unless force is specified)
    const mapping = config.repoMappings[currentRepo]
    if (!mapping && !options.force) {
      console.error(chalk.red('Error: This repository is not in the thoughts configuration.'))
      console.error(chalk.yellow('Use --force to remove the thoughts directory anyway.'))
      process.exit(1)
    }

    console.log(chalk.blue('Removing thoughts setup from current repository...'))

    // Use shared cleanup utility
    const result = cleanupThoughtsDirectory({
      repoPath: currentRepo,
      config,
      force: options.force,
      verbose: true,
    })

    // Save updated config
    if (result.configRemoved) {
      saveThoughtsConfig(config, options)
    }

    console.log(chalk.green('✅ Thoughts removed from repository'))

    // Provide info about what was done
    if (result.mappedName) {
      console.log('')
      console.log(chalk.gray('Note: Your thoughts content remains safe in:'))

      if (result.profileName && config.profiles && config.profiles[result.profileName]) {
        const profile = config.profiles[result.profileName]
        console.log(chalk.gray(`  ${profile.thoughtsRepo}/${profile.reposDir}/${result.mappedName}`))
        console.log(chalk.gray(`  (profile: ${result.profileName})`))
      } else {
        console.log(chalk.gray(`  ${config.thoughtsRepo}/${config.reposDir}/${result.mappedName}`))
      }

      console.log(chalk.gray('Only the local symlinks and configuration were removed.'))
    }

    // Execute PostThoughtsDestroy hooks
    const hooksConfig = loadHooksConfig(currentRepo)
    const postDestroyHooks = getHooksForEvent(hooksConfig, 'PostThoughtsDestroy')

    if (postDestroyHooks.length > 0) {
      const hookInput = {
        hook_event_name: 'PostThoughtsDestroy' as const,
        cwd: currentRepo,
        thoughts_removed: result.thoughtsRemoved,
        config_removed: result.configRemoved,
        mapped_name: result.mappedName,
        profile_name: result.profileName,
      }

      const hookEnv = {
        THC_THOUGHTS_REMOVED: result.thoughtsRemoved ? 'true' : 'false',
        THC_CONFIG_REMOVED: result.configRemoved ? 'true' : 'false',
        THC_MAPPED_NAME: result.mappedName || '',
        THC_PROFILE_NAME: result.profileName || '',
      }

      await executeHooks(postDestroyHooks, hookInput, hookEnv, true)
    }
  } catch (error) {
    console.error(chalk.red(`Error during thoughts destroy: ${error}`))
    process.exit(1)
  }
}
