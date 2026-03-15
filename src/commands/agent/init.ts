import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import { fileURLToPath } from 'url'
import { cp, mkdir, readdir } from 'fs/promises'
import type { AgentType, AgentInitOptions, Asset, InstallMode, InstallScope } from './types.js'
import { agents } from './registry.js'
import { discoverAllAssets } from './discovery.js'
import { installAssetForAgent } from './installer.js'
import { getDefaultConfigDir } from '../../config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ASSET_CATEGORIES = ['agents', 'skills'] as const

/** Find the bundled agent-assets directory relative to __dirname */
export function getBundledAssetsDir(): string | null {
  const candidates = [
    resolve(__dirname, '..', 'src', 'agent-assets'),
    resolve(__dirname, '..', '..', 'src', 'agent-assets'),
    resolve(__dirname, '..', '..', '..', 'src', 'agent-assets'),
  ]
  return candidates.find(dir => existsSync(dir)) ?? null
}

/**
 * Copy bundled assets to the config directory when it lacks agents/ and skills/ subdirectories.
 * Returns the config dir path on success, null if bundledDir is null.
 */
export async function bootstrapAssetsIfNeeded(
  configDir: string,
  bundledDir: string | null,
): Promise<string | null> {
  if (!bundledDir) return null

  const hasAssets = ASSET_CATEGORIES.some(cat => existsSync(join(configDir, cat)))
  if (hasAssets) return configDir

  for (const category of ASSET_CATEGORIES) {
    const src = join(bundledDir, category)
    const dest = join(configDir, category)

    if (!existsSync(src)) continue
    await mkdir(dest, { recursive: true })

    const entries = await readdir(src, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      await cp(join(src, entry.name), join(dest, entry.name), {
        recursive: true,
        force: false,
        errorOnExist: false,
      })
    }
  }

  return configDir
}

/**
 * Resolve the source directory for agent assets.
 * Priority: config dir (with asset subdirs) > bootstrap from bundled > bundled fallback.
 *
 * Optional configDir and bundledDir parameters override defaults for testability.
 */
export async function resolveSourceDir(
  configDir?: string,
  bundledDir?: string | null,
): Promise<string | null> {
  const config = configDir ?? getDefaultConfigDir()
  const bundled = bundledDir === undefined ? getBundledAssetsDir() : bundledDir

  // Priority 1: config directory already has asset subdirectories
  const hasAssets = ASSET_CATEGORIES.some(cat => existsSync(join(config, cat)))
  if (hasAssets) return config

  // Priority 2: bootstrap bundled assets into config dir
  const bootstrapped = await bootstrapAssetsIfNeeded(config, bundled)
  if (bootstrapped) return bootstrapped

  // Priority 3: fall back to bundled assets directly
  return bundled
}

/** Resolve the agent's config directory based on scope */
function resolveAgentBaseDir(agentType: AgentType, scope: InstallScope, cwd: string): string {
  const agent = agents[agentType]
  return scope === 'global' && agent.globalConfigDir
    ? agent.globalConfigDir
    : join(cwd, agent.configDir)
}

export async function agentInitCommand(options: AgentInitOptions): Promise<void> {
  try {
    p.intro(chalk.blue('Install Skills & Agents'))

    const sourceDir = await resolveSourceDir()
    if (!sourceDir) {
      p.log.error('Agent assets not found.')
      p.log.info('Bundled agent assets not found. Are you running from the package?')
      process.exit(1)
    }

    const discovered = await discoverAllAssets(sourceDir)
    const totalAssets = discovered.agents.length + discovered.skills.length

    if (totalAssets === 0) {
      p.log.warn(`No assets found in ${sourceDir}`)
      process.exit(0)
    }

    // Deterministic defaults
    const selectedAgents: AgentType[] = options.agents ?? ['claude-code']
    const scope: InstallScope = options.scope ?? 'project'
    const mode: InstallMode = options.mode ?? 'symlink'
    const cwd = process.cwd()

    // Check for existing installations (prompt only if TTY and not --force)
    if (!options.force) {
      for (const agentType of selectedAgents) {
        const agentDir = resolveAgentBaseDir(agentType, scope, cwd)

        if (existsSync(agentDir) && process.stdin.isTTY) {
          const overwrite = await p.confirm({
            message: `${agents[agentType].displayName} directory already exists at ${agentDir}. Overwrite?`,
            initialValue: false,
          })

          if (p.isCancel(overwrite) || !overwrite) {
            p.cancel('Operation cancelled.')
            process.exit(0)
          }
        }
      }
    }

    // Install all assets
    const allAssets = [...discovered.skills, ...discovered.agents]

    interface InstallEntry {
      asset: Asset
      agentType: AgentType
      success: boolean
      symlinkFailed?: boolean
      error?: string
    }
    const results: InstallEntry[] = []

    for (const asset of allAssets) {
      for (const agentType of selectedAgents) {
        const result = await installAssetForAgent(asset, agentType, { scope, cwd, mode })
        results.push({
          asset,
          agentType,
          success: result.success,
          symlinkFailed: result.symlinkFailed,
          error: result.error,
        })
      }
    }

    // Print itemized list by category
    for (const category of ASSET_CATEGORIES) {
      const categoryResults = results.filter(r => r.asset.category === category)
      if (categoryResults.length === 0) continue

      const label = category.charAt(0).toUpperCase() + category.slice(1)
      p.log.step(chalk.bold(label))

      for (const entry of categoryResults) {
        if (entry.success && entry.symlinkFailed) {
          p.log.warn(`  ⚠ ${entry.asset.name} (symlink failed, copied instead)`)
        } else if (entry.success) {
          p.log.success(`  ✓ ${entry.asset.name}`)
        } else {
          p.log.error(`  ✗ ${entry.asset.name}: ${entry.error}`)
        }
      }
    }

    // Summary
    const totalInstalled = results.filter(r => r.success).length
    const totalFailed = results.filter(r => !r.success).length
    const agentNames = selectedAgents.map(a => agents[a].displayName).join(', ')
    let message = `Installed ${totalInstalled} asset(s) to ${agentNames}`
    if (totalFailed > 0) {
      message += chalk.red(` (${totalFailed} failed)`)
    }
    message += chalk.gray(`\n   Scope: ${scope} | Mode: ${mode}`)

    p.outro(message)
  } catch (error) {
    p.log.error(`Error during agent init: ${error}`)
    process.exit(1)
  }
}
