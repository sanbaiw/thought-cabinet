#!/usr/bin/env node

import { Command } from 'commander'
import { thoughtsCommand } from './commands/thoughts.js'
import { agentCommand } from './commands/agent.js'
import { metadataCommand } from './commands/metadata.js'
import { worktreeCommand } from './commands/worktree.js'
import { hooksCommand } from './commands/hooks.js'
import dotenv from 'dotenv'
import { createRequire } from 'node:module'

// Load environment variables
dotenv.config()

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

const program = new Command()

program
  .name('thoughtcabinet')
  .description(
    'Thought Cabinet (thc) — CLI for structured AI coding workflows with filesystem-based memory and context management.',
  )
  .version(version)

// Add commands
thoughtsCommand(program)
agentCommand(program)
metadataCommand(program)
worktreeCommand(program)
hooksCommand(program)

program.parse(process.argv)
