import { Command } from 'commander'
import { agentInitCommand } from './agent/init.js'
import { skillUpdateCommand } from './agent/update.js'
import type { AgentType, InstallMode } from './agent/types.js'
import { isValidAgentType } from './agent/registry.js'

export function skillCommand(program: Command): void {
  const skill = program.command('skill').description('Manage skill and agent asset installation')

  skill
    .command('install')
    .description('Install skills and agent configs to target agent directories')
    .option('--target <agents...>', 'Target agents (e.g., claude-code codebuddy)')
    .option('-g, --global', 'Install to global scope')
    .option('--mode <mode>', 'Installation mode: symlink or copy (default: symlink)')
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
        force: options.force,
        all: options.all,
      })
    })

  skill
    .command('update')
    .description('Update skills from package bundle and refresh installations')
    .option('--all', 'Update all registered repos (from config repoMappings)')
    .action(async options => {
      await skillUpdateCommand({ all: options.all })
    })
}
