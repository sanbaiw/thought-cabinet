import { Command } from 'commander'

export function completionCommand(program: Command): void {
  const completion = program
    .command('completion')
    .description('Manage shell completion for thoughtcabinet CLI')

  completion
    .command('install')
    .description('Install shell completion scripts')
    .action(async () => {
      const { install } = await import('../completion/installer.js')
      await install()
    })

  completion
    .command('uninstall')
    .description('Remove shell completion scripts')
    .action(async () => {
      const { uninstall } = await import('../completion/installer.js')
      await uninstall()
    })
}
