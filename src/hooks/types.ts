/**
 * Hook type - currently only 'command' is supported
 */
export type HookType = 'command'

/**
 * Individual hook configuration
 */
export interface Hook {
  type: HookType
  command: string
  timeout?: number // Optional timeout in seconds (default: 60)
}

/**
 * Hook group with optional matcher (not used in v1)
 */
export interface HookGroup {
  matcher?: string // Reserved for future use
  hooks: Hook[]
}

/**
 * Supported hook events
 */
export type HookEvent =
  | 'PreWorktreeAdd'
  | 'PostWorktreeAdd'
  | 'PreWorktreeMerge'
  | 'PostWorktreeMerge'
  | 'PreWorktreeRemove'
  | 'PostWorktreeRemove'
  | 'PostThoughtsInit'
  | 'PostThoughtsDestroy'
  | 'PostThoughtsSync'

/**
 * Hook configuration file schema
 */
export interface HooksConfig {
  hooks: Partial<Record<HookEvent, HookGroup[]>>
}

/**
 * Hook execution context passed to hooks via stdin
 */
export interface HookInput {
  hook_event_name: HookEvent
  cwd: string
  [key: string]: unknown // Event-specific fields
}

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  timedOut: boolean
  duration: number // milliseconds
}
