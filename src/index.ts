#!/usr/bin/env node

import { Command } from 'commander'
import { thoughtsCommand } from './commands/thoughts.js'
import { claudeCommand } from './commands/claude.js'
import { metadataCommand } from './commands/metadata.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const program = new Command()

program
  .name('thoughtcabinet')
  .description(
    'Thought Cabinet (thc) - thoughts management CLI for developer notes and documentation',
  )
  .version('0.0.1')

// Add commands
thoughtsCommand(program)
claudeCommand(program)
metadataCommand(program)

program.parse(process.argv)
