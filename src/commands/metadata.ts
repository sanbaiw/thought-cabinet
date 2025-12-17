import { Command } from 'commander'
import { specMetadataCommand } from './metadata/metadata.js'

export function metadataCommand(program: Command): void {
  const metadata = program.description('Metadata utilities for current repository')

  metadata
    .command('metadata')
    .description('Output metadata for current repository (branch, commit, timestamp, etc.)')
    .action(specMetadataCommand)
}
