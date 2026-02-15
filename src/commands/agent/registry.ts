import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { AgentType, AgentConfig } from './types.js'

const home = homedir()
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude')
const codexHome = process.env.CODEX_HOME?.trim() || join(home, '.codex')

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
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    configDir: '.cursor',
    globalConfigDir: join(home, '.cursor'),
    detectInstalled: async () => existsSync(join(home, '.cursor')),
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    configDir: '.codex',
    globalConfigDir: codexHome,
    detectInstalled: async () => existsSync(codexHome),
  },
  'gemini-cli': {
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    configDir: '.gemini',
    globalConfigDir: join(home, '.gemini'),
    detectInstalled: async () => existsSync(join(home, '.gemini')),
  },
  cline: {
    name: 'cline',
    displayName: 'Cline',
    configDir: '.cline',
    globalConfigDir: join(home, '.cline'),
    detectInstalled: async () => existsSync(join(home, '.cline')),
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

// --- Legacy compatibility ---
// The old AgentProduct interface is used by the existing init.ts.
// We keep it available until Plan 2 replaces init.ts.

export interface AgentProduct {
  id: string
  name: string
  dirName: string
  sourceDirName: string
  envVarPrefix: string
  defaultEnvVars: Record<string, string>
  gitignoreEntry: string
}

export const AGENT_PRODUCTS: Record<string, AgentProduct> = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    dirName: '.claude',
    sourceDirName: 'src/agent-assets',
    envVarPrefix: 'CLAUDE',
    defaultEnvVars: {
      MAX_THINKING_TOKENS: '32000',
      CLAUDE_BASH_MAINTAIN_WORKING_DIR: '1',
    },
    gitignoreEntry: '.claude/settings.local.json',
  },
  codebuddy: {
    id: 'codebuddy',
    name: 'CodeBuddy Code',
    dirName: '.codebuddy',
    sourceDirName: 'src/agent-assets',
    envVarPrefix: 'CODEBUDDY',
    defaultEnvVars: {
      MAX_THINKING_TOKENS: '32000',
      CODEBUDDY_BASH_MAINTAIN_PROJECT_WORKING_DIR: '1',
    },
    gitignoreEntry: '.codebuddy/settings.local.json',
  },
}

export function getAgentProduct(id: string): AgentProduct {
  const product = AGENT_PRODUCTS[id]
  if (!product) {
    const validIds = Object.keys(AGENT_PRODUCTS).join(', ')
    throw new Error(`Unknown agent product: ${id}. Valid options: ${validIds}`)
  }
  return product
}

export function getAllAgentProducts(): AgentProduct[] {
  return Object.values(AGENT_PRODUCTS)
}
