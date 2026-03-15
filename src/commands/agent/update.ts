import { existsSync } from 'fs'
import { join } from 'path'
import { cp, readdir, mkdir, rm, lstat } from 'fs/promises'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import { getBundledAssetsDir } from './init.js'
import { getDefaultConfigDir, loadConfigFile } from '../../config.js'
import { discoverAllAssets } from './discovery.js'
import { installAssetForAgent } from './installer.js'
import { agents, getAllAgents } from './registry.js'
import { CATEGORY_SUBDIRS } from './constants.js'
import type { AgentType, InstallMode, InstallScope } from './types.js'

const ASSET_CATEGORIES = ['agents', 'skills'] as const

interface UpdateResult {
  seeded: string[]
  skipped: string[]
}

/**
 * Re-seed bundled assets into config dir, overwriting only those
 * that match bundled asset directory names.
 */
export async function updateBundledAssets(
  configDir: string,
  bundledDir: string,
): Promise<UpdateResult> {
  const seeded: string[] = []
  const skipped: string[] = []

  for (const category of ASSET_CATEGORIES) {
    const bundledCategoryDir = join(bundledDir, category)
    const configCategoryDir = join(configDir, category)

    if (!existsSync(bundledCategoryDir)) continue
    await mkdir(configCategoryDir, { recursive: true })

    const bundledEntries = await readdir(bundledCategoryDir, { withFileTypes: true })

    for (const entry of bundledEntries) {
      if (!entry.isDirectory()) continue

      const src = join(bundledCategoryDir, entry.name)
      const dest = join(configCategoryDir, entry.name)

      // Force overwrite: remove existing then copy
      await rm(dest, { recursive: true, force: true })
      await cp(src, dest, { recursive: true })
      seeded.push(`${category}/${entry.name}`)
    }

    // Identify user-added assets (in config dir but not in bundle)
    if (existsSync(configCategoryDir)) {
      const configEntries = await readdir(configCategoryDir, { withFileTypes: true })
      const bundledNames = new Set(bundledEntries.filter(e => e.isDirectory()).map(e => e.name))
      for (const entry of configEntries) {
        if (entry.isDirectory() && !bundledNames.has(entry.name)) {
          skipped.push(`${category}/${entry.name}`)
        }
      }
    }
  }

  return { seeded, skipped }
}

export interface InstallTarget {
  agentType: AgentType
  scope: InstallScope
  mode: InstallMode
  cwd: string
}

/**
 * Detect existing installations by scanning agent config dirs.
 * Returns a list of (agentType, scope, mode, cwd) to re-install into.
 */
export async function detectInstallTargets(repoPaths: string[]): Promise<InstallTarget[]> {
  const targets: InstallTarget[] = []

  for (const agent of getAllAgents()) {
    // Check project-scope installations for each repo
    for (const repoPath of repoPaths) {
      const mode = await detectModeInDir(repoPath, agent.configDir)
      if (mode) {
        targets.push({ agentType: agent.name, scope: 'project', mode, cwd: repoPath })
      }
    }

    // Check global-scope installation
    if (agent.globalConfigDir) {
      const mode = await detectModeInBaseDir(agent.globalConfigDir)
      if (mode) {
        targets.push({ agentType: agent.name, scope: 'global', mode, cwd: process.cwd() })
      }
    }
  }

  return targets
}

/**
 * Detect install mode by checking asset entries in an agent's config dir.
 * Checks skills/ and agents/ subdirs for symlink vs regular directory entries.
 * Returns the majority mode, or null if no assets found.
 */
async function detectModeInDir(
  repoPath: string,
  agentConfigDir: string,
): Promise<InstallMode | null> {
  const baseDir = join(repoPath, agentConfigDir)
  return detectModeInBaseDir(baseDir)
}

async function detectModeInBaseDir(baseDir: string): Promise<InstallMode | null> {
  let symlinkCount = 0
  let copyCount = 0

  for (const category of Object.values(CATEGORY_SUBDIRS)) {
    const categoryDir = join(baseDir, category)
    if (!existsSync(categoryDir)) continue

    try {
      const entries = await readdir(categoryDir)
      for (const name of entries) {
        const entryPath = join(categoryDir, name)
        try {
          const stats = await lstat(entryPath)
          if (stats.isSymbolicLink()) {
            symlinkCount++
          } else if (stats.isDirectory()) {
            copyCount++
          }
        } catch {
          // skip unreadable entries
        }
      }
    } catch {
      // skip unreadable category dirs
    }
  }

  if (symlinkCount === 0 && copyCount === 0) return null
  return symlinkCount >= copyCount ? 'symlink' : 'copy'
}

export interface SkillUpdateOptions {
  all?: boolean
}

export async function skillUpdateCommand(options: SkillUpdateOptions): Promise<void> {
  try {
    p.intro(chalk.blue('Update Skills'))

    // Step 1: Find bundled assets
    const bundledDir = getBundledAssetsDir()
    if (!bundledDir) {
      p.log.error('Bundled assets not found. Are you running from the package?')
      process.exit(1)
    }

    const configDir = getDefaultConfigDir()

    // Step 2: Re-seed config dir from bundle
    p.log.step('Updating config directory from bundle...')
    const seedResult = await updateBundledAssets(configDir, bundledDir)

    for (const name of seedResult.seeded) {
      p.log.info(`  Updated: ${name}`)
    }
    if (seedResult.skipped.length > 0) {
      p.log.info(chalk.gray(`  Preserved ${seedResult.skipped.length} custom asset(s)`))
    }

    // Step 3: Discover updated assets from config dir
    const discovered = await discoverAllAssets(configDir)
    // Filter to only bundled assets (those that were just seeded)
    const bundledAssetNames = new Set(seedResult.seeded.map(s => s.split('/')[1]))
    const bundledAssets = [
      ...discovered.agents.filter(a => bundledAssetNames.has(a.name)),
      ...discovered.skills.filter(a => bundledAssetNames.has(a.name)),
    ]

    if (bundledAssets.length === 0) {
      p.log.warn('No assets to update.')
      p.outro('Done.')
      return
    }

    // Step 4: Collect repo paths to scan
    const repoPaths: string[] = []

    if (options.all) {
      const config = loadConfigFile()
      if (config.thoughts?.repoMappings) {
        for (const repoPath of Object.keys(config.thoughts.repoMappings)) {
          if (existsSync(repoPath)) {
            repoPaths.push(repoPath)
          } else {
            p.log.warn(`Skipping (not found): ${repoPath}`)
          }
        }
      }
      // Include cwd if not already listed
      const cwd = process.cwd()
      if (!repoPaths.includes(cwd) && existsSync(join(cwd, '.git'))) {
        repoPaths.push(cwd)
      }
    } else {
      repoPaths.push(process.cwd())
    }

    // Step 5: Detect existing installations
    p.log.step('Detecting existing installations...')
    const targets = await detectInstallTargets(repoPaths)

    if (targets.length === 0) {
      p.log.warn('No existing installations detected. Run `thc skill install` first.')
      p.outro('Done.')
      return
    }

    for (const t of targets) {
      const scopeLabel = t.scope === 'global' ? 'global' : t.cwd
      p.log.info(chalk.gray(`  ${agents[t.agentType].displayName}: ${scopeLabel} (${t.mode})`))
    }

    // Step 6: Re-install updated assets into each detected target
    const s = p.spinner()
    s.start('Installing updated assets...')

    let totalInstalled = 0
    let totalFailed = 0

    for (const target of targets) {
      for (const asset of bundledAssets) {
        const result = await installAssetForAgent(asset, target.agentType, {
          scope: target.scope,
          cwd: target.cwd,
          mode: target.mode,
        })

        if (result.success) {
          totalInstalled++
        } else {
          totalFailed++
          if (result.error) {
            p.log.warn(
              `Failed: ${asset.name} → ${agents[target.agentType].displayName}: ${result.error}`,
            )
          }
        }
      }
    }

    s.stop('Update complete.')

    // Summary
    const uniqueRepos = new Set(targets.filter(t => t.scope === 'project').map(t => t.cwd))
    const hasGlobal = targets.some(t => t.scope === 'global')
    let message = `Updated ${totalInstalled} asset(s)`
    if (uniqueRepos.size > 0) {
      message += ` in ${uniqueRepos.size} repo(s)`
    }
    if (hasGlobal) {
      message += ` + global`
    }
    if (totalFailed > 0) {
      message += chalk.red(` (${totalFailed} failed)`)
    }

    p.outro(message)
  } catch (error) {
    p.log.error(`Error during skill update: ${error}`)
    process.exit(1)
  }
}
