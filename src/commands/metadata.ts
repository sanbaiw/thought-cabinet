import { Command } from 'commander'
import { specMetadataCommand } from './metadata/metadata.js'

export function metadataCommand(program: Command): void {
  program
    .command('metadata')
    .description('Output metadata for current repository (branch, commit, timestamp, etc.)')
    .action(specMetadataCommand)
}
