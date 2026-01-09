import fs from 'fs'
import path from 'path'

/** Agent configuration directory names */
export const AGENT_CONFIG_DIRS = ['.claude', '.codebuddy'] as const

export interface CopyAgentConfigOptions {
  /** Source directory (main worktree) */
  sourceDir: string
  /** Target directory (new worktree) */
  targetDir: string
  /** Configuration directories to copy, defaults to AGENT_CONFIG_DIRS */
  configDirs?: readonly string[]
}

export interface CopyAgentConfigResult {
  copied: string[]
  skipped: string[]
}

/**
 * Copy agent configuration directories to target location
 */
export function copyAgentConfigDirs(options: CopyAgentConfigOptions): CopyAgentConfigResult {
  const { sourceDir, targetDir, configDirs = AGENT_CONFIG_DIRS } = options
  const copied: string[] = []
  const skipped: string[] = []

  for (const dirName of configDirs) {
    const sourcePath = path.join(sourceDir, dirName)
    const targetPath = path.join(targetDir, dirName)

    if (!fs.existsSync(sourcePath)) {
      skipped.push(dirName)
      continue
    }

    // Recursively copy directory
    fs.cpSync(sourcePath, targetPath, { recursive: true })
    copied.push(dirName)
  }

  return { copied, skipped }
}
