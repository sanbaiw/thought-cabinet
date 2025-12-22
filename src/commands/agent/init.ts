import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import * as p from '@clack/prompts'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { AgentProduct } from './registry.js'

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface AgentInitOptions {
  product: AgentProduct
  force?: boolean
  all?: boolean
  maxThinkingTokens?: number
}

function ensureGitignoreEntry(targetDir: string, entry: string, productName: string): void {
  const gitignorePath = path.join(targetDir, '.gitignore')

  // Read existing .gitignore or create empty
  let gitignoreContent = ''
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
  }

  // Check if entry already exists
  const lines = gitignoreContent.split('\n')
  if (lines.some(line => line.trim() === entry)) {
    return // Already exists
  }

  // Add entry with section comment
  const newContent =
    gitignoreContent +
    (gitignoreContent && !gitignoreContent.endsWith('\n') ? '\n' : '') +
    '\n# ' +
    productName +
    ' local settings\n' +
    entry +
    '\n'

  fs.writeFileSync(gitignorePath, newContent)
}

export async function agentInitCommand(options: AgentInitOptions): Promise<void> {
  const { product } = options

  try {
    p.intro(chalk.blue(`Initialize ${product.name} Configuration`))

    // Check if running in interactive terminal
    if (!process.stdin.isTTY && !options.all) {
      p.log.error('Not running in interactive terminal.')
      p.log.info('Use --all flag to copy all files without prompting.')
      process.exit(1)
    }

    const targetDir = process.cwd()
    const agentTargetDir = path.join(targetDir, product.dirName)

    // Determine source location
    // Try multiple possible locations for the agent directory
    const possiblePaths = [
      // When installed via npm: package root is one level up from dist
      path.resolve(__dirname, '..', product.sourceDirName),
      // When running from repo: repo root is two levels up from dist
      path.resolve(__dirname, '../..', product.sourceDirName),
    ]

    let sourceAgentDir: string | null = null
    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        sourceAgentDir = candidatePath
        break
      }
    }

    // Verify source directory exists
    if (!sourceAgentDir) {
      p.log.error(`Source ${product.dirName} directory not found in expected locations`)
      p.log.info('Searched paths:')
      possiblePaths.forEach(candidatePath => {
        p.log.info(`  - ${candidatePath}`)
      })
      p.log.info('Are you running from the thoughtcabinet repository or npm package?')
      process.exit(1)
    }

    // Check if agent directory already exists
    if (fs.existsSync(agentTargetDir) && !options.force) {
      const overwrite = await p.confirm({
        message: `${product.dirName} directory already exists. Overwrite?`,
        initialValue: false,
      })

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }
    }

    let selectedCategories: string[]

    if (options.all) {
      selectedCategories = ['commands', 'agents', 'settings']
    } else {
      // Interactive selection
      // Calculate actual file counts
      let commandsCount = 0
      let agentsCount = 0

      const commandsDir = path.join(sourceAgentDir, 'commands')
      const agentsDir = path.join(sourceAgentDir, 'agents')

      if (fs.existsSync(commandsDir)) {
        commandsCount = fs.readdirSync(commandsDir).length
      }

      if (fs.existsSync(agentsDir)) {
        agentsCount = fs.readdirSync(agentsDir).length
      }

      p.note(
        'Use ↑/↓ to move, press Space to select/deselect, press A to select/deselect all, press Enter to confirm. (Subsequent multi-selects apply; Ctrl+C to exit)',
        'Multi-select instructions',
      )
      const selection = await p.multiselect({
        message: 'What would you like to copy?',
        options: [
          {
            value: 'commands',
            label: 'Commands',
            hint: `${commandsCount} workflow commands (planning, CI, research, etc.)`,
          },
          {
            value: 'agents',
            label: 'Agents',
            hint: `${agentsCount} specialized sub-agents for code analysis`,
          },
          {
            value: 'settings',
            label: 'Settings',
            hint: 'Project permissions configuration',
          },
        ],
        initialValues: ['commands', 'agents', 'settings'],
        required: false,
      })

      if (p.isCancel(selection)) {
        p.cancel('Operation cancelled.')
        process.exit(0)
      }

      selectedCategories = selection as string[]

      if (selectedCategories.length === 0) {
        p.cancel('No items selected.')
        process.exit(0)
      }
    }

    // Create agent directory
    fs.mkdirSync(agentTargetDir, { recursive: true })

    let filesCopied = 0
    let filesSkipped = 0

    // Wizard-style file selection for each category
    const filesToCopyByCategory: Record<string, string[]> = {}

    // If in interactive mode, prompt for file selection per category
    if (!options.all) {
      // Commands file selection (if selected)
      if (selectedCategories.includes('commands')) {
        const sourceDir = path.join(sourceAgentDir, 'commands')
        if (fs.existsSync(sourceDir)) {
          const allFiles = fs.readdirSync(sourceDir)
          const fileSelection = await p.multiselect({
            message: 'Select command files to copy:',
            options: allFiles.map(file => ({
              value: file,
              label: file,
            })),
            initialValues: allFiles,
            required: false,
          })

          if (p.isCancel(fileSelection)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
          }

          filesToCopyByCategory['commands'] = fileSelection as string[]

          if (filesToCopyByCategory['commands'].length === 0) {
            filesSkipped += allFiles.length
          }
        }
      }

      // Agents file selection (if selected)
      if (selectedCategories.includes('agents')) {
        const sourceDir = path.join(sourceAgentDir, 'agents')
        if (fs.existsSync(sourceDir)) {
          const allFiles = fs.readdirSync(sourceDir)
          const fileSelection = await p.multiselect({
            message: 'Select agent files to copy:',
            options: allFiles.map(file => ({
              value: file,
              label: file,
            })),
            initialValues: allFiles,
            required: false,
          })

          if (p.isCancel(fileSelection)) {
            p.cancel('Operation cancelled.')
            process.exit(0)
          }

          filesToCopyByCategory['agents'] = fileSelection as string[]

          if (filesToCopyByCategory['agents'].length === 0) {
            filesSkipped += allFiles.length
          }
        }
      }
    }

    // Configure settings
    let maxThinkingTokens = options.maxThinkingTokens

    // Prompt for settings if in interactive mode and not provided via flags
    if (!options.all && selectedCategories.includes('settings')) {
      if (maxThinkingTokens === undefined) {
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
      }
    } else if (selectedCategories.includes('settings')) {
      // Non-interactive mode: use defaults if not provided
      if (maxThinkingTokens === undefined) {
        maxThinkingTokens = 32000
      }
    }

    // Copy selected categories
    for (const category of selectedCategories) {
      if (category === 'commands' || category === 'agents') {
        const sourceDir = path.join(sourceAgentDir, category)
        const targetCategoryDir = path.join(agentTargetDir, category)

        if (!fs.existsSync(sourceDir)) {
          p.log.warn(`${category} directory not found in source, skipping`)
          continue
        }

        // Get all files in category
        const allFiles = fs.readdirSync(sourceDir)

        // Determine which files to copy
        let filesToCopy = allFiles
        if (!options.all && filesToCopyByCategory[category]) {
          filesToCopy = filesToCopyByCategory[category]
        }

        if (filesToCopy.length === 0) {
          continue
        }

        // Copy files
        fs.mkdirSync(targetCategoryDir, { recursive: true })

        for (const file of filesToCopy) {
          const sourcePath = path.join(sourceDir, file)
          const targetPath = path.join(targetCategoryDir, file)

          fs.copyFileSync(sourcePath, targetPath)
          filesCopied++
        }

        filesSkipped += allFiles.length - filesToCopy.length
        p.log.success(`Copied ${filesToCopy.length} ${category} file(s)`)
      } else if (category === 'settings') {
        const settingsPath = path.join(sourceAgentDir, 'settings.json')
        const targetSettingsPath = path.join(agentTargetDir, 'settings.json')

        if (fs.existsSync(settingsPath)) {
          // Read source settings
          const settingsContent = fs.readFileSync(settingsPath, 'utf8')
          const settings = JSON.parse(settingsContent)

          // Merge user's configuration into settings
          if (maxThinkingTokens !== undefined) {
            if (!settings.env) {
              settings.env = {}
            }
            settings.env.MAX_THINKING_TOKENS = maxThinkingTokens.toString()
          }

          // Set product-specific environment variables
          if (!settings.env) {
            settings.env = {}
          }
          for (const [key, value] of Object.entries(product.defaultEnvVars)) {
            settings.env[key] = value
          }

          // Write modified settings
          fs.writeFileSync(targetSettingsPath, JSON.stringify(settings, null, 2) + '\n')
          filesCopied++
          p.log.success(`Copied settings.json (maxTokens: ${maxThinkingTokens})`)
        } else {
          p.log.warn('settings.json not found in source, skipping')
        }
      }
    }

    // Update .gitignore to exclude settings.local.json
    if (selectedCategories.includes('settings')) {
      ensureGitignoreEntry(targetDir, product.gitignoreEntry, product.name)
      p.log.info('Updated .gitignore to exclude settings.local.json')
    }

    let message = `Successfully copied ${filesCopied} file(s) to ${agentTargetDir}`
    if (filesSkipped > 0) {
      message += chalk.gray(`\n   Skipped ${filesSkipped} file(s)`)
    }
    message += chalk.gray(`\n   You can now use these commands in ${product.name}.`)

    p.outro(message)
  } catch (error) {
    p.log.error(`Error during ${product.name} init: ${error}`)
    process.exit(1)
  }
}
