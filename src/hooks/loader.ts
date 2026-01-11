import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import type { HooksConfig, HookEvent, Hook } from './types.js'

/**
 * Default hooks configuration directory name
 */
export const HOOKS_CONFIG_DIR = '.thought-cabinet'

/**
 * Default hooks configuration file name
 */
export const HOOKS_CONFIG_FILE = `${HOOKS_CONFIG_DIR}/hooks.json`

/**
 * Load hooks configuration from repository root
 * @param repoPath - Path to repository
 * @returns Hooks configuration or null if not found
 */
export function loadHooksConfig(repoPath: string): HooksConfig | null {
  const configPath = path.join(repoPath, HOOKS_CONFIG_FILE)

  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(content) as HooksConfig

    // Basic validation
    if (!config.hooks || typeof config.hooks !== 'object') {
      console.error(
        chalk.yellow(`Warning: Invalid hooks config at ${configPath}: missing 'hooks' object`),
      )
      return null
    }

    return config
  } catch (error) {
    console.error(
      chalk.yellow(
        `Warning: Could not parse hooks config at ${configPath}: ${(error as Error).message}`,
      ),
    )
    return null
  }
}

/**
 * Get all hooks for a specific event
 * @param config - Hooks configuration
 * @param event - Hook event name
 * @returns Array of hooks to execute
 */
export function getHooksForEvent(config: HooksConfig | null, event: HookEvent): Hook[] {
  const hookGroups = config?.hooks[event]
  if (!hookGroups) {
    return []
  }

  return hookGroups.flatMap(group => group.hooks ?? [])
}
