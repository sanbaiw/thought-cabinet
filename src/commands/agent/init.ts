import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import type { AgentType, AgentInitOptions, Asset, InstallMode, InstallScope } from './types.js'
import { agents, detectInstalledAgents, getAllAgents } from './registry.js'
import { discoverAllAssets } from './discovery.js'
import { installAssetForAgent } from './installer.js'

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Resolve the source directory for agent assets.
 * Priority: --source flag > bundled assets
 */
function resolveSourceDir(customSource?: string): string | null {
  if (customSource) {
    const resolved = path.resolve(customSource)
    if (fs.existsSync(resolved)) return resolved
    return null
  }

  // Bundled assets (same heuristic as before)
  const possiblePaths = [
    path.resolve(__dirname, '..', 'src/agent-assets'),
    path.resolve(__dirname, '../..', 'src/agent-assets'),
  ]

  for (const candidate of possiblePaths) {
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}

function ensureGitignoreEntry(targetDir: string, entry: string, label: string): void {
  const gitignorePath = path.join(targetDir, '.gitignore')

  let gitignoreContent = ''
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
  }

  const lines = gitignoreContent.split('\n')
  if (lines.some(line => line.trim() === entry)) {
    return
  }

  const newContent =
    gitignoreContent +
    (gitignoreContent && !gitignoreContent.endsWith('\n') ? '\n' : '') +
    '\n# ' +
    label +
    ' local settings\n' +
    entry +
    '\n'

  fs.writeFileSync(gitignorePath, newContent)
}

/** Agent-specific environment variables for settings */
const AGENT_ENV_VARS: Partial<Record<AgentType, Record<string, string>>> = {
  'claude-code': {
    CLAUDE_BASH_MAINTAIN_WORKING_DIR: '1',
  },
  codebuddy: {
    CODEBUDDY_BASH_MAINTAIN_PROJECT_WORKING_DIR: '1',
  },
}

async function installSettings(
  sourceDir: string,
  agentTypes: AgentType[],
  scope: InstallScope,
  cwd: string,
  maxThinkingTokens: number,
): Promise<void> {
  const settingsPath = path.join(sourceDir, 'settings.template.json')
  if (!fs.existsSync(settingsPath)) {
    p.log.warn('settings.template.json not found in source, skipping settings')
    return
  }

  const settingsContent = fs.readFileSync(settingsPath, 'utf8')
  const baseSettings = JSON.parse(settingsContent)

  for (const agentType of agentTypes) {
    const agent = agents[agentType]
    const settings = JSON.parse(JSON.stringify(baseSettings)) // deep clone

    // Set thinking tokens
    if (!settings.env) settings.env = {}
    settings.env.MAX_THINKING_TOKENS = maxThinkingTokens.toString()

    // Set agent-specific env vars
    const agentEnv = AGENT_ENV_VARS[agentType]
    if (agentEnv) {
      for (const [key, value] of Object.entries(agentEnv)) {
        settings.env[key] = value
      }
    }

    // Determine target path
    const agentBase =
      scope === 'global' && agent.globalConfigDir
        ? agent.globalConfigDir
        : path.join(cwd, agent.configDir)

    fs.mkdirSync(agentBase, { recursive: true })
    const targetPath = path.join(agentBase, 'settings.json')
    fs.writeFileSync(targetPath, JSON.stringify(settings, null, 2) + '\n')
    p.log.success(`Settings installed for ${agent.displayName}`)
  }
}

export async function agentInitCommand(options: AgentInitOptions): Promise<void> {
  try {
    p.intro(chalk.blue('Initialize Agent Configuration'))

    // Non-interactive check
    if (!process.stdin.isTTY && !options.all) {
      p.log.error('Not running in interactive terminal.')
      p.log.info('Use --all flag to install all assets without prompting.')
      process.exit(1)
    }

    // 1. Resolve source directory
    const sourceDir = resolveSourceDir(options.source)
    if (!sourceDir) {
      p.log.error('Source directory not found.')
      if (options.source) {
        p.log.info(`Specified path: ${options.source}`)
      } else {
        p.log.info('Bundled agent assets not found. Are you running from the package?')
      }
      process.exit(1)
    }

    // 2. Discover assets
    const discovered = await discoverAllAssets(sourceDir)
    const totalAssets =
      discovered.commands.length + discovered.agents.length + discovered.skills.length

    if (totalAssets === 0) {
      p.log.warn(`No assets found in ${sourceDir}`)
      process.exit(0)
    }

    // 3. Agent selection
    let selectedAgents: AgentType[]

    if (options.agents) {
      selectedAgents = options.agents
    } else if (options.all) {
      // In non-interactive mode, default to claude-code
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

    // 4. Scope selection
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

    // 5. Mode selection
    let mode: InstallMode = options.mode ?? 'symlink'

    if (!options.mode && !options.all) {
      const modeChoice = await p.select({
        message: 'Installation mode:',
        options: [
          {
            value: 'symlink' as const,
            label: 'Symlink (recommended)',
            hint: 'Canonical storage + symlinks; update once, all agents see changes',
          },
          {
            value: 'copy' as const,
            label: 'Copy',
            hint: 'Independent copies for each agent',
          },
        ],
        initialValue: 'symlink' as const,
      })

      if (p.isCancel(modeChoice)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }

      mode = modeChoice as InstallMode
    }

    // 6. Check for existing installations (per-agent)
    if (!options.force) {
      const cwd = process.cwd()
      for (const agentType of selectedAgents) {
        const agent = agents[agentType]
        const agentDir =
          scope === 'global' && agent.globalConfigDir
            ? agent.globalConfigDir
            : path.join(cwd, agent.configDir)

        if (fs.existsSync(agentDir)) {
          if (!options.all) {
            const overwrite = await p.confirm({
              message: `${agent.displayName} directory already exists at ${agentDir}. Overwrite?`,
              initialValue: false,
            })

            if (p.isCancel(overwrite) || !overwrite) {
              p.cancel('Operation cancelled.')
              process.exit(0)
            }
          }
        }
      }
    }

    // 7. Category selection
    let selectedCategories: string[]

    if (options.all) {
      selectedCategories = ['commands', 'agents', 'skills', 'settings']
    } else {
      p.note(
        'Use ↑/↓ to move, Space to select/deselect, A to toggle all, Enter to confirm.',
        'Multi-select',
      )

      const selection = await p.multiselect({
        message: 'What would you like to install?',
        options: [
          {
            value: 'commands',
            label: 'Commands',
            hint: `${discovered.commands.length} workflow commands`,
          },
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
          {
            value: 'settings',
            label: 'Settings',
            hint: 'Project permissions configuration',
          },
        ],
        initialValues: ['commands', 'agents', 'skills', 'settings'],
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

    // 8. Per-category asset selection (interactive)
    const assetsToInstall: Asset[] = []

    if (!options.all) {
      for (const category of ['commands', 'agents', 'skills'] as const) {
        if (!selectedCategories.includes(category)) continue
        const categoryAssets = discovered[category]
        if (categoryAssets.length === 0) continue

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
    } else {
      // Non-interactive: add all assets from selected categories
      for (const category of ['commands', 'agents', 'skills'] as const) {
        if (selectedCategories.includes(category)) {
          assetsToInstall.push(...discovered[category])
        }
      }
    }

    // 9. Settings configuration
    let maxThinkingTokens = options.maxThinkingTokens

    if (selectedCategories.includes('settings')) {
      if (!options.all && maxThinkingTokens === undefined) {
        const tokensPrompt = await p.text({
          message: 'Maximum thinking tokens:',
          initialValue: '32000',
          validate: value => {
            const num = parseInt(value, 10)
            if (isNaN(num) || num < 1000) {
              return 'Please enter a valid number (minimum 1000)'
            }
            return undefined
          },
        })

        if (p.isCancel(tokensPrompt)) {
          p.cancel('Operation cancelled.')
          process.exit(0)
        }

        maxThinkingTokens = parseInt(tokensPrompt as string, 10)
      } else if (maxThinkingTokens === undefined) {
        maxThinkingTokens = 32000
      }
    }

    // 10. Installation loop
    const cwd = process.cwd()
    let totalInstalled = 0
    let totalFailed = 0
    const symlinkWarnings: string[] = []

    const s = p.spinner()
    s.start('Installing assets...')

    for (const asset of assetsToInstall) {
      for (const agentType of selectedAgents) {
        const result = await installAssetForAgent(asset, agentType, {
          scope,
          cwd,
          mode,
        })

        if (result.success) {
          totalInstalled++
          if (result.symlinkFailed) {
            symlinkWarnings.push(
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

    // 11. Settings installation (per-agent)
    if (selectedCategories.includes('settings')) {
      await installSettings(sourceDir, selectedAgents, scope, cwd, maxThinkingTokens!)
    }

    // 12. Gitignore updates (per-agent)
    for (const agentType of selectedAgents) {
      const agent = agents[agentType]
      if (scope === 'project') {
        ensureGitignoreEntry(cwd, `${agent.configDir}/settings.local.json`, agent.displayName)
      }
    }

    // 13. Summary
    if (symlinkWarnings.length > 0) {
      p.log.warn('Symlink warnings:')
      for (const warning of symlinkWarnings) {
        p.log.warn(`  ${warning}`)
      }
    }

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
