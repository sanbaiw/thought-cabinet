import { spawn } from 'child_process'
import chalk from 'chalk'
import type { Hook, HookInput, HookExecutionResult } from './types.js'

/**
 * Default timeout for hook execution (60 seconds)
 */
const DEFAULT_TIMEOUT_SECONDS = 60

/**
 * Determine the exit code for a hook execution result
 */
function resolveExitCode(exitCode: number | null, timedOut: boolean): number {
  if (exitCode !== null) {
    return exitCode
  }
  if (timedOut) {
    return 124 // Standard timeout exit code
  }
  return 1
}

/**
 * Execute a single hook
 * @param hook - Hook configuration
 * @param input - Hook input data (passed via stdin as JSON)
 * @param env - Additional environment variables
 * @returns Execution result
 */
export async function executeHook(
  hook: Hook,
  input: HookInput,
  env: Record<string, string> = {},
): Promise<HookExecutionResult> {
  const startTime = Date.now()
  const timeoutMs = (hook.timeout ?? DEFAULT_TIMEOUT_SECONDS) * 1000

  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const child = spawn('bash', ['-c', hook.command], {
      cwd: input.cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
      }, 5000)
    }, timeoutMs)

    // Send input via stdin (hook may or may not consume it)
    child.stdin.write(JSON.stringify(input, null, 2))
    child.stdin.end()

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('close', exitCode => {
      clearTimeout(timer)
      const duration = Date.now() - startTime

      resolve({
        success: exitCode === 0 && !timedOut,
        exitCode: resolveExitCode(exitCode, timedOut),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        duration,
      })
    })

    child.on('error', error => {
      clearTimeout(timer)
      const duration = Date.now() - startTime

      resolve({
        success: false,
        exitCode: 1,
        stdout: stdout.trim(),
        stderr: `Failed to execute hook: ${error.message}`,
        timedOut: false,
        duration,
      })
    })
  })
}

/**
 * Display the result of a single hook execution
 */
function displayHookResult(hook: Hook, result: HookExecutionResult, verbose: boolean): void {
  const timeoutSeconds = hook.timeout ?? DEFAULT_TIMEOUT_SECONDS

  if (result.timedOut) {
    console.log(chalk.yellow(`Warning: Hook timed out after ${timeoutSeconds}s: ${hook.command}`))
    if (result.stderr) {
      console.log(chalk.yellow(result.stderr))
    }
    return
  }

  switch (result.exitCode) {
    case 0:
      console.log(chalk.gray(`Hook completed (${result.duration}ms): ${hook.command}`))
      if (verbose && result.stdout) {
        console.log(chalk.gray(result.stdout))
      }
      break

    case 2:
      // Exit code 2: blocking error (always show stderr)
      console.log(chalk.red(`Hook failed with exit code 2: ${hook.command}`))
      if (result.stderr) {
        console.log(chalk.red(result.stderr))
      }
      break

    default:
      // Other exit codes: non-blocking error
      console.log(
        chalk.yellow(`Warning: Hook failed with exit code ${result.exitCode}: ${hook.command}`),
      )
      if (verbose && result.stderr) {
        console.log(chalk.yellow(result.stderr))
      }
  }
}

/**
 * Execute all hooks for an event in parallel
 * @param hooks - Array of hooks to execute
 * @param input - Hook input data
 * @param env - Additional environment variables
 * @param verbose - Show detailed output
 * @returns Array of execution results
 */
export async function executeHooks(
  hooks: Hook[],
  input: HookInput,
  env: Record<string, string> = {},
  verbose = false,
): Promise<HookExecutionResult[]> {
  if (hooks.length === 0) {
    return []
  }

  if (verbose) {
    console.log(chalk.gray(`\nExecuting ${hooks.length} hook(s) for ${input.hook_event_name}...`))
  }

  const results = await Promise.all(hooks.map(hook => executeHook(hook, input, env)))

  for (let i = 0; i < results.length; i++) {
    displayHookResult(hooks[i], results[i], verbose)
  }

  return results
}
