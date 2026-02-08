import { execFileSync } from 'child_process'

// Session naming
export function sessionNameForHandle(handle: string): string {
  // NOTE: tmux uses ':' as a target separator (session:window.pane),
  // so ':' is not allowed in session names on many tmux versions.
  return `thc-${handle}`
}

export function legacySessionNameForHandle(handle: string): string {
  return `thc:${handle}`
}

export function allSessionNamesForHandle(handle: string): string[] {
  return [sessionNameForHandle(handle), legacySessionNameForHandle(handle)]
}

// Availability check
let _tmuxAvailable: boolean | undefined

export function isTmuxAvailable(): boolean {
  if (_tmuxAvailable === undefined) {
    try {
      execFileSync('tmux', ['-V'], { stdio: 'ignore' })
      _tmuxAvailable = true
    } catch {
      _tmuxAvailable = false
    }
  }
  return _tmuxAvailable
}

// Session management
export function listTmuxSessions(): string[] {
  try {
    const out = execFileSync('tmux', ['list-sessions', '-F', '#{session_name}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return out
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export function tmuxHasSession(sessionName: string): boolean {
  try {
    execFileSync('tmux', ['has-session', '-t', sessionName], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

export function tmuxNewSession(sessionName: string, cwd: string): void {
  execFileSync('tmux', ['new-session', '-d', '-s', sessionName, '-c', cwd], {
    stdio: 'inherit',
  })
}

export function tmuxKillSession(sessionName: string): void {
  try {
    execFileSync('tmux', ['kill-session', '-t', sessionName], { stdio: 'ignore' })
  } catch {
    // ignore
  }
}
