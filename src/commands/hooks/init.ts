import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { HOOKS_CONFIG_DIR, HOOKS_CONFIG_FILE } from '../../hooks/index.js'

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function hooksInitCommand(): Promise<void> {
  try {
    const repoPath = process.cwd()
    const configDir = path.join(repoPath, HOOKS_CONFIG_DIR)
    const configPath = path.join(repoPath, HOOKS_CONFIG_FILE)

    // Check if config already exists
    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow(`${HOOKS_CONFIG_FILE} already exists.`))
      console.log(chalk.gray(`Edit the file directly: ${configPath}`))
      return
    }

    // Find the example file
    // Try multiple possible locations for the example file
    const possiblePaths = [
      // When running from built dist: one level up from dist/
      path.resolve(__dirname, '..', '.thought-cabinet/hooks.example.json'),
      // When installed via npm: one level up from dist/
      path.resolve(__dirname, '../..', '.thought-cabinet/hooks.example.json'),
    ]

    let examplePath: string | null = null
    for (const candidatePath of possiblePaths) {
      if (fs.existsSync(candidatePath)) {
        examplePath = candidatePath
        break
      }
    }

    if (!examplePath) {
      console.error(chalk.red('Error: hooks.example.json not found in expected locations'))
      console.log(chalk.gray('Searched paths:'))
      possiblePaths.forEach(p => console.log(chalk.gray(`  - ${p}`)))
      process.exit(1)
    }

    // Create directory and copy example file
    fs.mkdirSync(configDir, { recursive: true })
    fs.copyFileSync(examplePath, configPath)

    console.log(chalk.green(`Created ${HOOKS_CONFIG_FILE}`))
  } catch (error) {
    console.error(chalk.red(`Error during hooks init: ${error}`))
    process.exit(1)
  }
}
