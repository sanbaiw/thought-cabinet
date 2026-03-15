#!/usr/bin/env node

import { Command } from 'commander'
import { thoughtsCommand } from './commands/thoughts.js'
import { skillCommand } from './commands/agent.js'
import { metadataCommand } from './commands/metadata.js'
import { worktreeCommand } from './commands/worktree.js'
import { hooksCommand } from './commands/hooks.js'
import { completionCommand } from './commands/completion.js'
import { handleCompletion } from './completion/handler.js'
import dotenv from 'dotenv'
import { createRequire } from 'node:module'

async function main(): Promise<void> {
  // Handle shell completion before anything else
  const completionHandled = await handleCompletion()
  if (completionHandled) {
    process.exit(0)
  }

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
  skillCommand(program)
  metadataCommand(program)
  worktreeCommand(program)
  hooksCommand(program)
  completionCommand(program)

  program.parse(process.argv)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
