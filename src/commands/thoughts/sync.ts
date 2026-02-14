import fs from 'fs'
import path from 'path'
import { execSync, execFileSync } from 'child_process'
import chalk from 'chalk'
import {
  loadThoughtsConfig,
  getCurrentRepoPath,
  expandPath,
  getRepoNameFromPath,
  updateSymlinksForNewUsers,
  parseGitRemoteUrl,
  buildFileShareLink,
} from './utils/index.js'
import { resolveProfileForRepo, getRepoNameFromMapping } from './profile/utils.js'
import { createSearchableIndex } from './init-core.js'
import { loadHooksConfig, getHooksForEvent, executeHooks } from '../../hooks/index.js'

interface SyncOptions {
  message?: string
  configFile?: string
}

function checkGitStatus(repoPath: string): boolean {
  try {
    const status = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    return status.trim().length > 0
  } catch {
    return false
  }
}

function syncThoughts(thoughtsRepo: string, message: string, repoName?: string): void {
  const expandedRepo = expandPath(thoughtsRepo)

  try {
    // Stage all changes
    execSync('git add -A', { cwd: expandedRepo, stdio: 'pipe' })

    // Check if there are changes to commit
    const hasChanges = checkGitStatus(expandedRepo)

    if (hasChanges) {
      // Commit changes
      const defaultMessage = `Sync thoughts - ${new Date().toISOString()}`
      const body = message || defaultMessage
      const commitMessage = repoName ? `[${repoName}] ${body}` : body
      execFileSync('git', ['commit', '-m', commitMessage], { cwd: expandedRepo, stdio: 'pipe' })

      console.log(chalk.green('✅ Thoughts synchronized'))
    } else {
      console.log(chalk.gray('No changes to commit'))
    }

    // Pull latest changes after committing (to avoid conflicts with staged changes)
    try {
      execSync('git pull --rebase', {
        stdio: 'pipe',
        cwd: expandedRepo,
      })
    } catch (error) {
      const errorStr = error.toString()
      if (
        errorStr.includes('CONFLICT (') ||
        errorStr.includes('Automatic merge failed') ||
        errorStr.includes('Patch failed at') ||
        errorStr.includes('When you have resolved this problem, run "git rebase --continue"')
      ) {
        console.error(chalk.red('Error: Merge conflict detected in thoughts repository'))
        console.error(chalk.red('Please resolve conflicts manually in:'), expandedRepo)
        console.error(chalk.red('Then run "git rebase --continue" and "thoughtcabinet sync" again'))
        process.exit(1)
      } else {
        // If pull fails for other reasons, show warning but continue
        // This handles cases like no upstream, network issues, etc.
        console.warn(chalk.yellow('Warning: Could not pull latest changes:'), error.message)
      }
    }

    // Check if remote exists and push any unpushed commits
    try {
      execSync('git remote get-url origin', { cwd: expandedRepo, stdio: 'pipe' })

      // Try to push
      console.log(chalk.gray('Pushing to remote...'))
      try {
        execSync('git push', { cwd: expandedRepo, stdio: 'pipe' })
        console.log(chalk.green('✅ Pushed to remote'))

        // Generate share links for changed files
        try {
          const branch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: expandedRepo,
            encoding: 'utf8',
            stdio: 'pipe',
          }).trim()

          const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', {
            cwd: expandedRepo,
            encoding: 'utf8',
            stdio: 'pipe',
          })
            .trim()
            .split('\n')
            .filter(Boolean)

          const remoteUrl = execSync('git remote get-url origin', {
            cwd: expandedRepo,
            encoding: 'utf8',
            stdio: 'pipe',
          }).trim()

          const parsed = parseGitRemoteUrl(remoteUrl)
          if (parsed && changedFiles.length > 0) {
            console.log(chalk.cyan('📎 Share links:'))
            for (const file of changedFiles) {
              const link = buildFileShareLink(parsed, branch, file)
              console.log(chalk.gray(`   ${link}`))
            }
          }
        } catch {
          // Non-critical: don't fail sync if share link generation fails
        }
      } catch {
        console.log(chalk.yellow('⚠️  Could not push to remote. You may need to push manually.'))
      }
    } catch {
      // No remote configured
      console.log(chalk.yellow('ℹ️  No remote configured for thoughts repository'))
    }
  } catch (error) {
    console.error(chalk.red(`Error syncing thoughts: ${error}`))
    process.exit(1)
  }
}

export async function thoughtsSyncCommand(options: SyncOptions): Promise<void> {
  try {
    // Check if thoughts are configured
    const config = loadThoughtsConfig(options)

    if (!config) {
      console.error(chalk.red('Error: Thoughts not configured. Run "thoughtcabinet init" first.'))
      process.exit(1)
    }

    // Check if current repo has thoughts setup
    const currentRepo = getCurrentRepoPath()
    const thoughtsDir = path.join(currentRepo, 'thoughts')

    if (!fs.existsSync(thoughtsDir)) {
      console.error(chalk.red('Error: Thoughts not initialized for this repository.'))
      console.error('Run "thoughtcabinet init" to set up thoughts.')
      process.exit(1)
    }

    // Get current repo mapping and resolve profile
    const mapping = config.repoMappings[currentRepo]
    const mappedName = getRepoNameFromMapping(mapping)
    const profileConfig = resolveProfileForRepo(config, currentRepo)

    if (mappedName) {
      // Update symlinks for any new users using profile config
      const newUsers = updateSymlinksForNewUsers(
        currentRepo,
        profileConfig,
        mappedName,
        config.user,
      )

      if (newUsers.length > 0) {
        console.log(chalk.green(`✓ Added symlinks for new users: ${newUsers.join(', ')}`))
      }
    }

    // Create searchable directory with hard links
    console.log(chalk.blue('Creating searchable index...'))
    const linkedCount = createSearchableIndex(thoughtsDir)
    console.log(chalk.gray(`Created ${linkedCount} hard links in searchable directory`))

    // Sync the thoughts repository using profile's thoughtsRepo
    console.log(chalk.blue('Syncing thoughts...'))
    const repoName =
      config.commitRepoPrefix !== false
        ? mappedName || getRepoNameFromPath(currentRepo)
        : undefined
    syncThoughts(profileConfig.thoughtsRepo, options.message || '', repoName)

    // Execute PostThoughtsSync hooks
    const hooksConfig = loadHooksConfig(currentRepo)
    const postSyncHooks = getHooksForEvent(hooksConfig, 'PostThoughtsSync')

    if (postSyncHooks.length > 0) {
      const hookInput = {
        hook_event_name: 'PostThoughtsSync' as const,
        cwd: currentRepo,
        thoughts_repo: profileConfig.thoughtsRepo,
        has_changes: true,
        searchable_created: true,
      }

      const hookEnv = {
        THC_THOUGHTS_REPO: profileConfig.thoughtsRepo,
        THC_HAS_CHANGES: 'true',
        THC_SEARCHABLE_CREATED: 'true',
      }

      await executeHooks(postSyncHooks, hookInput, hookEnv, true)
    }
  } catch (error) {
    console.error(chalk.red(`Error during thoughts sync: ${error}`))
    process.exit(1)
  }
}
