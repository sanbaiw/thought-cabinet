import fs from 'fs'
import chalk from 'chalk'
import { loadThoughtsConfig, saveThoughtsConfig } from './utils/index.js'
import { getRepoNameFromMapping, getProfileNameFromMapping } from './profile/utils.js'

interface PruneOptions {
  apply?: boolean
  configFile?: string
}

interface StaleEntry {
  repoPath: string
  mappedName: string | undefined
  profileName: string | undefined
}

export async function thoughtsPruneCommand(options: PruneOptions): Promise<void> {
  try {
    // Load config
    const config = loadThoughtsConfig(options)
    if (!config) {
      console.error(chalk.red('Error: Thoughts configuration not found.'))
      console.error('Run "thoughtcabinet init" to create one.')
      process.exit(1)
    }

    const mappings = Object.entries(config.repoMappings)

    if (mappings.length === 0) {
      console.log(chalk.gray('No repository mappings configured.'))
      return
    }

    // Find stale entries (repo paths that no longer exist)
    const staleEntries: StaleEntry[] = []

    for (const [repoPath, mapping] of mappings) {
      if (!fs.existsSync(repoPath)) {
        staleEntries.push({
          repoPath,
          mappedName: getRepoNameFromMapping(mapping),
          profileName: getProfileNameFromMapping(mapping),
        })
      }
    }

    if (staleEntries.length === 0) {
      console.log(chalk.green('No stale repository mappings found.'))
      console.log(chalk.gray(`All ${mappings.length} mapped repositories exist.`))
      return
    }

    // Display stale entries
    console.log(chalk.yellow(`Found ${staleEntries.length} stale repository mapping(s):`))
    console.log('')

    for (const entry of staleEntries) {
      console.log(`  ${chalk.red('✗')} ${chalk.cyan(entry.repoPath)}`)
      console.log(`    → ${chalk.gray(entry.mappedName || '(unknown)')}`)
      if (entry.profileName) {
        console.log(`    Profile: ${chalk.yellow(entry.profileName)}`)
      }
    }

    console.log('')

    // Apply changes if --apply flag is set
    if (options.apply) {
      console.log(chalk.blue('Removing stale entries from configuration...'))

      for (const entry of staleEntries) {
        delete config.repoMappings[entry.repoPath]
      }

      saveThoughtsConfig(config, options)

      console.log(chalk.green(`✅ Removed ${staleEntries.length} stale mapping(s).`))
      console.log('')
      console.log(chalk.gray('Note: The thoughts content in your thoughts repository was not modified.'))
      console.log(chalk.gray('Only the configuration entries pointing to non-existent directories were removed.'))
    } else {
      console.log(chalk.gray('This is a dry run. No changes were made.'))
      console.log(chalk.gray('Run with --apply to remove these stale entries.'))
    }
  } catch (error) {
    console.error(chalk.red(`Error during thoughts prune: ${error}`))
    process.exit(1)
  }
}
