import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import chalk from 'chalk'
import { loadThoughtsConfig, getCurrentRepoPath, expandPath } from './utils/index.js'
import {
  getRepoNameFromMapping,
  getProfileNameFromMapping,
  resolveProfileForRepo,
} from './profile/utils.js'

function getGitStatus(repoPath: string): string {
  try {
    return execSync('git status -sb', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()
  } catch {
    return 'Not a git repository'
  }
}

function getUncommittedChanges(repoPath: string): string[] {
  try {
    const output = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    })

    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const status = line.substring(0, 2)
        const file = line.substring(3)
        let statusText = ''

        if (status[0] === 'M' || status[1] === 'M') statusText = 'modified'
        else if (status[0] === 'A') statusText = 'added'
        else if (status[0] === 'D') statusText = 'deleted'
        else if (status[0] === '?') statusText = 'untracked'
        else if (status[0] === 'R') statusText = 'renamed'

        return `  ${chalk.yellow(statusText.padEnd(10))} ${file}`
      })
  } catch {
    return []
  }
}

function getLastCommit(repoPath: string): string {
  try {
    return execSync('git log -1 --pretty=format:"%h %s (%cr)"', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()
  } catch {
    return 'No commits yet'
  }
}

const STALE_FETCH_THRESHOLD_HOURS = 6

function getFetchAgeMs(repoPath: string): number | null {
  const fetchHead = path.join(repoPath, '.git', 'FETCH_HEAD')
  try {
    const stat = fs.statSync(fetchHead)
    return Date.now() - stat.mtimeMs
  } catch {
    return null
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function getRemoteStatus(repoPath: string, doFetch: boolean): string {
  try {
    execSync('git remote get-url origin', { cwd: repoPath, stdio: 'pipe' })

    if (doFetch) {
      try {
        execSync('git fetch', { cwd: repoPath, stdio: 'pipe' })
      } catch {
        // Fetch might fail, continue anyway
      }
    }

    const status = execSync('git status -sb', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    })

    if (status.includes('ahead')) {
      const ahead = status.match(/ahead (\d+)/)?.[1] || '?'
      return chalk.yellow(`${ahead} commits ahead of remote`)
    } else if (status.includes('behind')) {
      const behind = status.match(/behind (\d+)/)?.[1] || '?'
      return chalk.yellow(`${behind} commits behind remote`)
    } else {
      return chalk.green('Up to date with remote')
    }
  } catch {
    return chalk.gray('No remote configured')
  }
}

interface StatusOptions {
  configFile?: string
  fetch?: boolean
  maxAgeSecs?: string
}

export async function thoughtsStatusCommand(options: StatusOptions): Promise<void> {
  try {
    // Check if thoughts are configured
    const config = loadThoughtsConfig(options)

    if (!config) {
      console.error(chalk.red('Error: Thoughts not configured. Run "thoughtcabinet init" first.'))
      process.exit(1)
    }

    console.log(chalk.blue('Thoughts Repository Status'))
    console.log(chalk.gray('='.repeat(50)))
    console.log('')

    // Show configuration
    console.log(chalk.yellow('Configuration:'))
    console.log(`  Repository: ${chalk.cyan(config.thoughtsRepo)}`)
    console.log(`  Repos directory: ${chalk.cyan(config.reposDir)}`)
    console.log(`  Global directory: ${chalk.cyan(config.globalDir)}`)
    console.log(`  User: ${chalk.cyan(config.user)}`)
    console.log(`  Mapped repos: ${chalk.cyan(Object.keys(config.repoMappings).length)}`)
    console.log('')

    // Check current repo mapping
    const currentRepo = getCurrentRepoPath()
    const currentMapping = config.repoMappings[currentRepo]
    const mappedName = getRepoNameFromMapping(currentMapping)
    const profileName = getProfileNameFromMapping(currentMapping)
    const profileConfig = resolveProfileForRepo(config, currentRepo)

    if (mappedName) {
      console.log(chalk.yellow('Current Repository:'))
      console.log(`  Path: ${chalk.cyan(currentRepo)}`)
      console.log(`  Thoughts directory: ${chalk.cyan(`${profileConfig.reposDir}/${mappedName}`)}`)

      // Add profile info
      if (profileName) {
        console.log(`  Profile: ${chalk.cyan(profileName)}`)
      } else {
        console.log(`  Profile: ${chalk.gray('(default)')}`)
      }

      const thoughtsDir = path.join(currentRepo, 'thoughts')
      if (fs.existsSync(thoughtsDir)) {
        console.log(`  Status: ${chalk.green('✓ Initialized')}`)
      } else {
        console.log(`  Status: ${chalk.red('✗ Not initialized')}`)
      }
    } else {
      console.log(chalk.yellow('Current repository not mapped to thoughts'))
    }
    console.log('')

    // Show thoughts repository git status using profile's thoughtsRepo
    const expandedRepo = expandPath(profileConfig.thoughtsRepo)

    console.log(chalk.yellow('Thoughts Repository Git Status:'))
    if (profileName) {
      console.log(chalk.gray(`  (using profile: ${profileName})`))
    }
    console.log(`  ${getGitStatus(expandedRepo)}`)

    const doFetch = options.fetch ?? false
    const staleThresholdMs =
      (parseInt(options.maxAgeSecs ?? '', 10) || STALE_FETCH_THRESHOLD_HOURS * 60 * 60) * 1000

    console.log(`  Remote: ${getRemoteStatus(expandedRepo, doFetch)}`)

    if (!doFetch) {
      const fetchAgeMs = getFetchAgeMs(expandedRepo)
      if (fetchAgeMs === null) {
        console.log(chalk.gray('    (never fetched, use --fetch to refresh)'))
      } else if (fetchAgeMs > staleThresholdMs) {
        console.log(
          chalk.gray(`    (last fetched ${formatDuration(fetchAgeMs)} ago, use --fetch to refresh)`),
        )
      }
    }

    console.log(`  Last commit: ${getLastCommit(expandedRepo)}`)
    console.log('')

    // Show uncommitted changes
    const changes = getUncommittedChanges(expandedRepo)
    if (changes.length > 0) {
      console.log(chalk.yellow('Uncommitted changes:'))
      changes.forEach(change => console.log(change))
      console.log('')
      console.log(chalk.gray('Run "thoughtcabinet sync" to commit these changes'))
    } else {
      console.log(chalk.green('✓ No uncommitted changes'))
    }
  } catch (error) {
    console.error(chalk.red(`Error checking thoughts status: ${error}`))
    process.exit(1)
  }
}
