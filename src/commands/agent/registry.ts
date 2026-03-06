import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { AgentType, AgentConfig } from './types.js'

const home = homedir()
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude')

/**
 * Curated agent registry.
 * Each agent defines where its assets live at project and global scope.
 */
export const agents: Record<AgentType, AgentConfig> = {
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    configDir: '.claude',
    globalConfigDir: claudeHome,
    detectInstalled: async () => existsSync(claudeHome),
  },
  codebuddy: {
    name: 'codebuddy',
    displayName: 'CodeBuddy Code',
    configDir: '.codebuddy',
    globalConfigDir: join(home, '.codebuddy'),
    detectInstalled: async () =>
      existsSync(join(process.cwd(), '.codebuddy')) || existsSync(join(home, '.codebuddy')),
  },
}

/** Get agent config by type, throws if unknown */
export function getAgentConfig(type: AgentType): AgentConfig {
  const config = agents[type]
  if (!config) {
    const valid = Object.keys(agents).join(', ')
    throw new Error(`Unknown agent: ${type}. Valid agents: ${valid}`)
  }
  return config
}

/** Get all registered agents */
export function getAllAgents(): AgentConfig[] {
  return Object.values(agents)
}

/** Detect which agents are installed on this system */
export async function detectInstalledAgents(): Promise<AgentType[]> {
  const results = await Promise.all(
    Object.entries(agents).map(async ([type, config]) => ({
      type: type as AgentType,
      installed: await config.detectInstalled(),
    })),
  )
  return results.filter(r => r.installed).map(r => r.type)
}

/** Check if a given string is a valid AgentType */
export function isValidAgentType(value: string): value is AgentType {
  return value in agents
}
