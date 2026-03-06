import { Command } from 'commander'
import { agentInitCommand } from './agent/init.js'
import type { AgentType, InstallMode } from './agent/types.js'
import { isValidAgentType } from './agent/registry.js'

export function agentCommand(program: Command): void {
  const agent = program.command('agent').description('Manage coding agent configuration')

  agent
    .command('init')
    .description('Initialize coding agent configuration in current directory')
    .option('--target <agents...>', 'Target agents (e.g., claude-code codebuddy)')
    .option('-g, --global', 'Install to global scope')
    .option('--mode <mode>', 'Installation mode: symlink or copy (default: symlink)')
    .option('--source <path>', 'Source directory for assets')
    .option('--force', 'Force overwrite of existing installations')
    .option('--all', 'Install all assets without prompting')
    .action(async options => {
      const agentTypes: AgentType[] | undefined = options.target?.map((a: string) => {
        if (!isValidAgentType(a)) {
          console.error(`Unknown agent: ${a}`)
          process.exit(1)
        }
        return a as AgentType
      })

      let mode: InstallMode | undefined
      if (options.mode) {
        if (options.mode !== 'symlink' && options.mode !== 'copy') {
          console.error(`Invalid mode: ${options.mode}. Must be 'symlink' or 'copy'`)
          process.exit(1)
        }
        mode = options.mode as InstallMode
      }

      await agentInitCommand({
        agents: agentTypes,
        scope: options.global ? 'global' : undefined,
        mode,
        source: options.source,
        force: options.force,
        all: options.all,
      })
    })
}
