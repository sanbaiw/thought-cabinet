import { Command } from 'commander'
import { hooksInitCommand } from './hooks/init.js'

export function hooksCommand(program: Command): void {
  const hooks = program.command('hooks').description('Manage hook configuration')

  hooks
    .command('init')
    .description('Initialize hooks configuration in current repository')
    .action(hooksInitCommand)
}
