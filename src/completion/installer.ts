import tabtab from 'tabtab'
// @ts-expect-error -- tabtab/lib/installer has no type declarations
import tabtabInstaller from 'tabtab/lib/installer.js'
import * as p from '@clack/prompts'
import chalk from 'chalk'

const CLI_NAMES = ['thoughtcabinet', 'thc']

type Shell = 'bash' | 'zsh' | 'fish'

const SHELL_LOCATIONS: Record<Shell, string> = {
  bash: '~/.bashrc',
  zsh: '~/.zshrc',
  fish: '~/.config/fish/config.fish',
}

const SHELL_RESTART_INSTRUCTIONS: Record<Shell, string> = {
  bash: '  source ~/.bashrc',
  zsh: '  source ~/.zshrc',
  fish: '  # fish completions are loaded automatically',
}

function detectShell(): Shell | undefined {
  const shell = tabtab.shell() as string
  if (shell === 'bash' || shell === 'zsh' || shell === 'fish') {
    return shell
  }
  return undefined
}

export async function install(): Promise<void> {
  p.intro(chalk.blue('Install Shell Completion'))

  const detected = detectShell()

  const shellChoice = await p.select({
    message: 'Which shell do you use?',
    options: [
      { value: 'bash' as const, label: 'Bash', hint: detected === 'bash' ? 'detected' : undefined },
      { value: 'zsh' as const, label: 'Zsh', hint: detected === 'zsh' ? 'detected' : undefined },
      { value: 'fish' as const, label: 'Fish', hint: detected === 'fish' ? 'detected' : undefined },
    ],
    initialValue: detected ?? ('bash' as const),
  })

  if (p.isCancel(shellChoice)) {
    p.cancel('Operation cancelled.')
    process.exit(0)
  }

  const shell = shellChoice as Shell
  const location = SHELL_LOCATIONS[shell]

  const s = p.spinner()
  s.start('Installing completion scripts...')

  for (const name of CLI_NAMES) {
    try {
      await tabtabInstaller.install({ name, completer: name, location })
    } catch (error) {
      s.stop(chalk.red(`Failed to install completion for ${name}: ${error}`))
      process.exit(1)
    }
  }

  s.stop('Completion scripts installed.')

  p.note(chalk.cyan(SHELL_RESTART_INSTRUCTIONS[shell]), 'Restart your shell or run')

  p.outro(chalk.green('Shell completion enabled for thoughtcabinet and thc'))
}

export async function uninstall(): Promise<void> {
  p.intro(chalk.blue('Uninstall Shell Completion'))

  const s = p.spinner()
  s.start('Removing completion scripts...')

  for (const name of CLI_NAMES) {
    try {
      await tabtab.uninstall({ name })
    } catch (error) {
      s.stop(chalk.red(`Failed to uninstall completion for ${name}: ${error}`))
      process.exit(1)
    }
  }

  s.stop('Completion scripts removed.')

  p.outro(chalk.green('Shell completion disabled'))
}
