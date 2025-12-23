/**
 * Agent Product Registry
 *
 * Manages configuration for different coding agent products (claude-code, codebuddy-code, etc.)
 */

export interface AgentProduct {
  id: string // 'claude' | 'codebuddy'
  name: string // 'Claude Code' | 'CodeBuddy Code'
  dirName: string // '.claude' | '.codebuddy'
  sourceDirName: string // '.claude' | '.codebuddy'
  envVarPrefix: string // 'CLAUDE' | 'CODEBUDDY'
  defaultEnvVars: Record<string, string>
  gitignoreEntry: string // Relative path to settings.local.json
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
      // Note: Current not implemented in CodeBuddy
      CODEBUDDY_BASH_MAINTAIN_PROJECT_WORKING_DIR: '1',
    },
    gitignoreEntry: '.codebuddy/settings.local.json',
  },
}

/**
 * Get agent product configuration by ID
 * @throws Error if product ID is unknown
 */
export function getAgentProduct(id: string): AgentProduct {
  const product = AGENT_PRODUCTS[id]
  if (!product) {
    const validIds = Object.keys(AGENT_PRODUCTS).join(', ')
    throw new Error(`Unknown agent product: ${id}. Valid options: ${validIds}`)
  }
  return product
}

/**
 * Get all available agent products
 */
export function getAllAgentProducts(): AgentProduct[] {
  return Object.values(AGENT_PRODUCTS)
}
