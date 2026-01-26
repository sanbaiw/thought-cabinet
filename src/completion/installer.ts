import tabtab from 'tabtab'
import chalk from 'chalk'

const CLI_NAMES = ['thoughtcabinet', 'thc']

const SHELL_RESTART_INSTRUCTIONS = `
${chalk.yellow('Please restart your shell or run:')}
${chalk.cyan('  source ~/.bashrc   # for bash')}
${chalk.cyan('  source ~/.zshrc    # for zsh')}
${chalk.cyan('  # fish completions are loaded automatically')}`

export async function install(): Promise<void> {
  console.log(chalk.blue('Installing shell completion...'))

  for (const name of CLI_NAMES) {
    try {
      await tabtab.install({ name, completer: name })
      console.log(chalk.green(`Installed completion for ${name}`))
    } catch (error) {
      console.error(chalk.red(`Failed to install completion for ${name}: ${error}`))
    }
  }

  console.log(SHELL_RESTART_INSTRUCTIONS)
}

export async function uninstall(): Promise<void> {
  console.log(chalk.blue('Uninstalling shell completion...'))

  for (const name of CLI_NAMES) {
    try {
      await tabtab.uninstall({ name })
      console.log(chalk.green(`Uninstalled completion for ${name}`))
    } catch (error) {
      console.error(chalk.red(`Failed to uninstall completion for ${name}: ${error}`))
    }
  }
}
