import { Command } from 'commander'
import { agentInitCommand } from './agent/init.js'
import { getAgentProduct } from './agent/registry.js'

export function agentCommand(program: Command): void {
  const agent = program.command('agent').description('Manage coding agent configuration')

  agent
    .command('init')
    .description('Initialize coding agent configuration in current directory')
    .option('--force', 'Force overwrite of existing agent directory')
    .option('--all', 'Copy all files without prompting')
    .option('--max-thinking-tokens <number>', 'Maximum thinking tokens (default: 32000)', value =>
      parseInt(value, 10),
    )
    .option('--name <name>', 'Agent name to configure (claude|codebuddy)', 'claude')
    .action(async options => {
      const product = getAgentProduct(options.name)
      await agentInitCommand({ ...options, product })
    })
}
