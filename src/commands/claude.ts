import { Command } from 'commander'
import { agentInitCommand } from './agent/init.js'
import { getAgentProduct } from './agent/registry.js'

export function claudeCommand(program: Command): void {
  const claude = program.command('claude').description('Manage coding agent configuration')

  claude
    .command('init')
    .description('Initialize coding agent configuration in current directory')
    .option('--force', 'Force overwrite of existing agent directory')
    .option('--all', 'Copy all files without prompting')
    .option('--max-thinking-tokens <number>', 'Maximum thinking tokens (default: 32000)', value =>
      parseInt(value, 10),
    )
    .option('--agent <name>', 'Agent to configure (claude|codebuddy)', 'claude')
    .action(async options => {
      const product = getAgentProduct(options.agent)
      await agentInitCommand({ ...options, product })
    })
}
