import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import { fileURLToPath } from 'url'
import { cp, mkdir, readdir } from 'fs/promises'
import type { AgentType, AgentInitOptions, Asset, InstallMode, InstallScope } from './types.js'
import { agents, detectInstalledAgents, getAllAgents } from './registry.js'
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
 * Priority: --source flag > config dir (with asset subdirs) > bootstrap from bundled > bundled fallback.
 *
 * Optional configDir and bundledDir parameters override defaults for testability.
 */
export async function resolveSourceDir(
  customSource?: string,
  configDir?: string,
  bundledDir?: string | null,
): Promise<string | null> {
  // Priority 1: explicit --source flag
  if (customSource) {
    const resolved = resolve(customSource)
    return existsSync(resolved) ? resolved : null
  }

  const config = configDir ?? getDefaultConfigDir()
  const bundled = bundledDir === undefined ? getBundledAssetsDir() : bundledDir

  // Priority 2: config directory already has asset subdirectories
  const hasAssets = ASSET_CATEGORIES.some(cat => existsSync(join(config, cat)))
  if (hasAssets) return config

  // Priority 3: bootstrap bundled assets into config dir
  const bootstrapped = await bootstrapAssetsIfNeeded(config, bundled)
  if (bootstrapped) return bootstrapped

  // Priority 4: fall back to bundled assets directly
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
    p.intro(chalk.blue('Initialize Agent Configuration'))

    if (!process.stdin.isTTY && !options.all) {
      p.log.error('Not running in interactive terminal.')
      p.log.info('Use --all flag to install all assets without prompting.')
      process.exit(1)
    }

    const sourceDir = await resolveSourceDir(options.source)
    if (!sourceDir) {
      p.log.error('Source directory not found.')
      if (options.source) {
        p.log.info(`Specified path: ${options.source}`)
      } else {
        p.log.info('Bundled agent assets not found. Are you running from the package?')
      }
      process.exit(1)
    }

    const discovered = await discoverAllAssets(sourceDir)
    const totalAssets = discovered.agents.length + discovered.skills.length

    if (totalAssets === 0) {
      p.log.warn(`No assets found in ${sourceDir}`)
      process.exit(0)
    }

    // Agent selection
    let selectedAgents: AgentType[]

    if (options.agents) {
      selectedAgents = options.agents
    } else if (options.all) {
      selectedAgents = ['claude-code']
    } else {
      const detected = await detectInstalledAgents()
      const allAgents = getAllAgents()

      const agentSelection = await p.multiselect({
        message: 'Select target agents:',
        options: allAgents.map(agent => ({
          value: agent.name,
          label: agent.displayName,
          hint: detected.includes(agent.name) ? 'detected' : undefined,
        })),
        initialValues: detected.length > 0 ? detected : ['claude-code'],
        required: true,
      })

      if (p.isCancel(agentSelection)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }

      selectedAgents = agentSelection as AgentType[]
    }

    // Scope selection
    let scope: InstallScope = options.scope ?? 'project'

    if (!options.scope && !options.all) {
      const supportsGlobal = selectedAgents.some(a => agents[a].globalConfigDir !== undefined)

      if (supportsGlobal) {
        const scopeChoice = await p.select({
          message: 'Installation scope:',
          options: [
            {
              value: 'project' as const,
              label: 'Project',
              hint: 'Install to current directory',
            },
            {
              value: 'global' as const,
              label: 'Global',
              hint: 'Install to home directory (available across projects)',
            },
          ],
          initialValue: 'project' as const,
        })

        if (p.isCancel(scopeChoice)) {
          p.cancel('Operation cancelled.')
          process.exit(0)
        }

        scope = scopeChoice as InstallScope
      }
    }

    // Mode: default to symlink, allow --mode copy override
    const mode: InstallMode = options.mode ?? 'symlink'

    // Check for existing installations
    if (!options.force) {
      const cwd = process.cwd()
      for (const agentType of selectedAgents) {
        const agentDir = resolveAgentBaseDir(agentType, scope, cwd)

        if (existsSync(agentDir) && !options.all) {
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

    // Category selection
    let selectedCategories: string[]

    if (options.all) {
      selectedCategories = [...ASSET_CATEGORIES]
    } else {
      p.note(
        'Use ↑/↓ to move, Space to select/deselect, A to toggle all, Enter to confirm.',
        'Multi-select',
      )

      const selection = await p.multiselect({
        message: 'What would you like to install?',
        options: [
          {
            value: 'agents',
            label: 'Agents',
            hint: `${discovered.agents.length} specialized sub-agents`,
          },
          {
            value: 'skills',
            label: 'Skills',
            hint: `${discovered.skills.length} skill packages`,
          },
        ],
        initialValues: ['agents', 'skills'],
        required: false,
      })

      if (p.isCancel(selection)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }

      selectedCategories = selection as string[]

      if (selectedCategories.length === 0) {
        p.cancel('No categories selected.')
        process.exit(0)
      }
    }

    // Per-category asset selection
    const assetsToInstall: Asset[] = []

    for (const category of ASSET_CATEGORIES) {
      if (!selectedCategories.includes(category)) continue
      const categoryAssets = discovered[category]
      if (categoryAssets.length === 0) continue

      if (options.all) {
        assetsToInstall.push(...categoryAssets)
        continue
      }

      const assetSelection = await p.multiselect({
        message: `Select ${category} to install:`,
        options: categoryAssets.map(asset => ({
          value: asset.name,
          label: asset.name,
          hint: asset.description || undefined,
        })),
        initialValues: categoryAssets.map(a => a.name),
        required: false,
      })

      if (p.isCancel(assetSelection)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }

      const selectedNames = new Set(assetSelection as string[])
      assetsToInstall.push(...categoryAssets.filter(a => selectedNames.has(a.name)))
    }

    // Install assets
    const cwd = process.cwd()
    let totalInstalled = 0
    let totalFailed = 0

    const s = p.spinner()
    s.start('Installing assets...')

    for (const asset of assetsToInstall) {
      for (const agentType of selectedAgents) {
        const result = await installAssetForAgent(asset, agentType, { scope, cwd, mode })

        if (result.success) {
          totalInstalled++
          if (result.symlinkFailed) {
            p.log.warn(
              `${asset.name} → ${agents[agentType].displayName}: symlink failed, copied instead`,
            )
          }
        } else {
          totalFailed++
          p.log.warn(`Failed: ${asset.name} → ${agents[agentType].displayName}: ${result.error}`)
        }
      }
    }

    s.stop('Installation complete.')

    // Summary
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
