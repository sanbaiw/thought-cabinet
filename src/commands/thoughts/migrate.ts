import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import { getDefaultConfigDir, getLegacyConfigDir, ConfigResolver } from '../../config.js'
import { expandPath } from './utils/paths.js'

interface MigrateOptions {
  dryRun?: boolean
  configFile?: string
}

export interface MoveEntry {
  from: string
  to: string
  label: string
}

export interface MigrationPlan {
  moves: MoveEntry[]
  newConfigDir: string
  legacyConfigDir: string
  config: Record<string, unknown>
  affectedRepos: string[]
}

/**
 * Plan the migration from legacy config dir to new config dir.
 * Returns null if there's nothing to migrate or already at new location.
 * Pure function suitable for testing — no side effects beyond reading the filesystem.
 */
export function planMigration(homeDir?: string): MigrationPlan | null {
  const home = homeDir || process.env.HOME || ''
  const newConfigDir = path.join(home, '.thought-cabinet')
  const legacyConfigDir = path.join(home, '.config', 'thought-cabinet')
  const legacyConfigPath = path.join(legacyConfigDir, 'config.json')
  const newConfigPath = path.join(newConfigDir, 'config.json')

  // Already at new location
  if (fs.existsSync(newConfigPath)) {
    return null
  }

  // No legacy config to migrate
  if (!fs.existsSync(legacyConfigPath)) {
    return null
  }

  // Load old config
  let config: Record<string, unknown>
  try {
    config = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf8'))
  } catch {
    return null
  }

  const thoughts = config.thoughts as
    | {
        thoughtsRepo?: string
        profiles?: Record<string, { thoughtsRepo: string }>
        repoMappings?: Record<string, unknown>
      }
    | undefined

  if (!thoughts) {
    return null
  }

  const moves: MoveEntry[] = []

  // 1. Config file
  moves.push({
    from: legacyConfigPath,
    to: path.join(newConfigDir, 'config.json'),
    label: 'Config file',
  })

  // 2. Agent assets
  for (const dir of ['agents', 'skills']) {
    const src = path.join(legacyConfigDir, dir)
    if (fs.existsSync(src)) {
      moves.push({
        from: src,
        to: path.join(newConfigDir, dir),
        label: `${dir}/ directory`,
      })
    }
  }

  // 3. Default thoughts repo
  if (thoughts.thoughtsRepo) {
    const expandedThoughtsRepo = expandPath(thoughts.thoughtsRepo)
    const newDefaultThoughtsRepo = path.join(newConfigDir, 'thoughts')
    if (
      fs.existsSync(expandedThoughtsRepo) &&
      expandedThoughtsRepo !== newDefaultThoughtsRepo &&
      !expandedThoughtsRepo.startsWith(newConfigDir + path.sep)
    ) {
      moves.push({
        from: expandedThoughtsRepo,
        to: newDefaultThoughtsRepo,
        label: `Default thoughts repo (${thoughts.thoughtsRepo})`,
      })
    }
  }

  // 4. Profile thoughts repos
  if (thoughts.profiles) {
    for (const [name, profile] of Object.entries(thoughts.profiles)) {
      const expandedProfileRepo = expandPath(profile.thoughtsRepo)
      const newProfileRepo = path.join(newConfigDir, `thoughts-${name}`)
      if (
        fs.existsSync(expandedProfileRepo) &&
        expandedProfileRepo !== newProfileRepo &&
        !expandedProfileRepo.startsWith(newConfigDir + path.sep)
      ) {
        moves.push({
          from: expandedProfileRepo,
          to: newProfileRepo,
          label: `Profile "${name}" thoughts repo (${profile.thoughtsRepo})`,
        })
      }
    }
  }

  // Collect affected repos
  const affectedRepos = thoughts.repoMappings ? Object.keys(thoughts.repoMappings) : []

  return {
    moves,
    newConfigDir,
    legacyConfigDir,
    config,
    affectedRepos,
  }
}

/**
 * Execute a migration plan: move files/dirs and update config paths.
 * Separated from planMigration for testability.
 */
export function executeMigration(plan: MigrationPlan): void {
  fs.mkdirSync(plan.newConfigDir, { recursive: true })

  for (const move of plan.moves) {
    const destDir = path.dirname(move.to)
    fs.mkdirSync(destDir, { recursive: true })
    fs.renameSync(move.from, move.to)
  }

  // Update config paths
  const thoughts = plan.config.thoughts as {
    thoughtsRepo?: string
    profiles?: Record<string, { thoughtsRepo: string }>
  }

  if (thoughts) {
    thoughts.thoughtsRepo = path.join(plan.newConfigDir, 'thoughts')

    if (thoughts.profiles) {
      for (const [name, profile] of Object.entries(thoughts.profiles)) {
        profile.thoughtsRepo = path.join(plan.newConfigDir, `thoughts-${name}`)
      }
    }
  }

  // Write updated config
  const newConfigPath = path.join(plan.newConfigDir, 'config.json')
  fs.writeFileSync(newConfigPath, JSON.stringify(plan.config, null, 2))
}

/**
 * Interactive migrate command entry point.
 */
export async function thoughtsMigrateCommand(options: MigrateOptions): Promise<void> {
  const newConfigDir = getDefaultConfigDir()
  const legacyConfigDir = getLegacyConfigDir()
  const newConfigPath = path.join(newConfigDir, ConfigResolver.DEFAULT_CONFIG_FILE)
  const legacyConfigPath = path.join(legacyConfigDir, ConfigResolver.DEFAULT_CONFIG_FILE)

  // Check if there's anything to migrate
  if (!fs.existsSync(legacyConfigPath)) {
    if (fs.existsSync(newConfigPath)) {
      p.log.info('Configuration is already at the new location.')
      return
    }
    p.log.info('No configuration found to migrate.')
    return
  }

  if (legacyConfigDir === newConfigDir) {
    p.log.info('Configuration is already at the expected location.')
    return
  }

  const plan = planMigration()

  if (!plan) {
    p.log.info('Nothing to migrate.')
    return
  }

  p.intro(chalk.blue('Migrate Thought Cabinet Configuration'))

  // Show plan
  p.log.step('Migration plan:')
  for (const move of plan.moves) {
    p.log.message(`  ${move.label}`)
    p.log.message(chalk.gray(`    ${move.from} → ${move.to}`))
  }

  if (options.dryRun) {
    p.log.info('Dry run — no changes made.')
    return
  }

  // Confirm
  const confirm = await p.confirm({
    message: 'Proceed with migration?',
    initialValue: true,
  })

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Migration cancelled.')
    return
  }

  // Execute
  executeMigration(plan)

  for (const move of plan.moves) {
    p.log.success(`Moved: ${move.label}`)
  }

  // Try to clean up old dir if empty
  try {
    const remaining = fs.readdirSync(plan.legacyConfigDir)
    if (remaining.length === 0) {
      fs.rmdirSync(plan.legacyConfigDir)
      p.log.info(`Removed empty directory: ${plan.legacyConfigDir}`)
    }
  } catch {
    // Ignore cleanup errors
  }

  // Warn about broken symlinks
  if (plan.affectedRepos.length > 0) {
    p.log.warn('Symlinks in existing repos now point to the old location.')
    p.log.info('Re-run `thc thoughts init --force` in each affected repo:')
    for (const repo of plan.affectedRepos) {
      p.log.message(chalk.gray(`  cd ${repo} && thc thoughts init --force`))
    }
  }

  p.outro(chalk.green('Migration complete!'))
}
