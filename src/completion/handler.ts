import tabtab from 'tabtab'
import { getProfileNames, getWorktreeNames, getBranchNames, getAgentNames } from './providers.js'

// Top-level commands available on the program
const TOP_LEVEL_COMMANDS = [
  'init',
  'destroy',
  'sync',
  'status',
  'config',
  'prune',
  'migrate',
  'profile',
  'worktree',
  'skill',
  'metadata',
  'hooks',
  'completion',
]

// Subcommands for command groups
const SUBCOMMANDS: Record<string, string[]> = {
  profile: ['create', 'list', 'show', 'delete'],
  worktree: ['add', 'list', 'merge', 'remove'],
  skill: ['install', 'update'],
  hooks: ['init'],
  completion: ['install', 'uninstall'],
}

// Options for each command
const OPTIONS: Record<string, string[]> = {
  init: ['--force', '--config-file', '--directory', '--profile'],
  destroy: ['--force', '--config-file'],
  sync: ['-m', '--message', '--config-file'],
  status: ['--config-file', '--fetch'],
  config: ['--edit', '--json', '--config-file'],
  prune: ['--apply', '--config-file'],
  migrate: ['--dry-run', '--config-file'],
  'profile create': ['--repo', '--repos-dir', '--global-dir', '--config-file'],
  'profile list': ['--json', '--config-file'],
  'profile show': ['--json', '--config-file'],
  'profile delete': ['--force', '--config-file'],
  'worktree add': ['--branch', '--base', '--path', '--detached', '--no-thoughts'],
  'worktree list': ['--all'],
  'worktree merge': ['--into', '--force', '--keep-session', '--keep-worktree', '--keep-branch'],
  'worktree remove': ['--force'],
  'skill install': ['--force', '--target', '--global', '--mode'],
  'skill update': ['--all'],
}

// Commands that expect dynamic arguments
const DYNAMIC_ARGS: Record<string, () => string[]> = {
  'profile show': getProfileNames,
  'profile delete': getProfileNames,
  'worktree merge': getWorktreeNames,
  'worktree remove': getWorktreeNames,
}

// Options that expect dynamic values
const DYNAMIC_OPTIONS: Record<string, () => string[]> = {
  '--profile': getProfileNames,
  '--branch': getBranchNames,
  '--base': getBranchNames,
  '--into': getBranchNames,
  '--target': getAgentNames,
  '--mode': () => ['symlink', 'copy'],
}

export async function handleCompletion(): Promise<boolean> {
  const env = tabtab.parseEnv(process.env)

  if (!env.complete) {
    return false
  }

  const { line, prev } = env
  const args = line.split(' ').filter(Boolean).slice(1) // Remove CLI name

  // Check if previous word is an option expecting dynamic value
  if (prev in DYNAMIC_OPTIONS) {
    const provider = DYNAMIC_OPTIONS[prev]
    await tabtab.log(provider())
    return true
  }

  // Complete top-level commands
  if (args.length === 0 || (args.length === 1 && !line.endsWith(' '))) {
    const partial = args[0] || ''
    const matches = TOP_LEVEL_COMMANDS.filter(cmd => cmd.startsWith(partial))
    await tabtab.log(matches)
    return true
  }

  const firstArg = args[0]

  // Complete subcommands for command groups
  if (firstArg in SUBCOMMANDS) {
    const subcommands = SUBCOMMANDS[firstArg]
    if (args.length === 1 && line.endsWith(' ')) {
      await tabtab.log(subcommands)
      return true
    }
    if (args.length === 2 && !line.endsWith(' ')) {
      const partial = args[1]
      const matches = subcommands.filter(sub => sub.startsWith(partial))
      await tabtab.log(matches)
      return true
    }
  }

  // Check for dynamic argument completion
  const commandKey = args.slice(0, 2).join(' ')
  if (commandKey in DYNAMIC_ARGS && args.length === 2 && line.endsWith(' ')) {
    const provider = DYNAMIC_ARGS[commandKey]
    await tabtab.log(provider())
    return true
  }

  // Complete options
  if (prev.startsWith('-')) {
    // Option expects a value, don't complete
    await tabtab.log([])
    return true
  }

  // Determine command context for options
  const options = OPTIONS[commandKey] || OPTIONS[firstArg] || []

  if (line.endsWith(' ') || prev.startsWith('-')) {
    const usedOptions = args.filter(arg => arg.startsWith('-'))
    const availableOptions = options.filter(opt => !usedOptions.includes(opt))
    await tabtab.log(availableOptions)
    return true
  }

  await tabtab.log([])
  return true
}
