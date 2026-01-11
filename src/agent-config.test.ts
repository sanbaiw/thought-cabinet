import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { copyAgentConfigDirs, AGENT_CONFIG_DIRS } from './agent-config.js'

describe('copyAgentConfigDirs', () => {
  let tempDir: string
  let sourceDir: string
  let targetDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-config-test-'))
    sourceDir = path.join(tempDir, 'source')
    targetDir = path.join(tempDir, 'target')
    fs.mkdirSync(sourceDir)
    fs.mkdirSync(targetDir)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should copy .claude directory', () => {
    // Setup
    const claudeDir = path.join(sourceDir, '.claude')
    fs.mkdirSync(claudeDir)
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}')

    // Execute
    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    // Verify
    expect(result.copied).toContain('.claude')
    expect(fs.existsSync(path.join(targetDir, '.claude', 'settings.json'))).toBe(true)
  })

  it('should copy .codebuddy directory', () => {
    // Setup
    const codebuddyDir = path.join(sourceDir, '.codebuddy')
    fs.mkdirSync(codebuddyDir)
    fs.writeFileSync(path.join(codebuddyDir, 'config.json'), '{}')

    // Execute
    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    // Verify
    expect(result.copied).toContain('.codebuddy')
    expect(fs.existsSync(path.join(targetDir, '.codebuddy', 'config.json'))).toBe(true)
  })

  it('should copy all files including settings.local.json', () => {
    // Setup
    const claudeDir = path.join(sourceDir, '.claude')
    fs.mkdirSync(claudeDir)
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}')
    fs.writeFileSync(path.join(claudeDir, 'settings.local.json'), '{}')

    // Execute
    copyAgentConfigDirs({ sourceDir, targetDir })

    // Verify
    expect(fs.existsSync(path.join(targetDir, '.claude', 'settings.json'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, '.claude', 'settings.local.json'))).toBe(true)
  })

  it('should copy nested directories recursively', () => {
    // Setup
    const claudeDir = path.join(sourceDir, '.claude')
    const nestedDir = path.join(claudeDir, 'commands')
    fs.mkdirSync(nestedDir, { recursive: true })
    fs.writeFileSync(path.join(nestedDir, 'custom.md'), '# Custom command')

    // Execute
    copyAgentConfigDirs({ sourceDir, targetDir })

    // Verify
    expect(fs.existsSync(path.join(targetDir, '.claude', 'commands', 'custom.md'))).toBe(true)
    expect(fs.readFileSync(path.join(targetDir, '.claude', 'commands', 'custom.md'), 'utf8')).toBe(
      '# Custom command',
    )
  })

  it('should skip non-existent directories', () => {
    // Execute (no .claude or .codebuddy in source)
    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    // Verify
    expect(result.copied).toHaveLength(0)
    expect(result.skipped).toContain('.claude')
    expect(result.skipped).toContain('.codebuddy')
  })

  it('should copy both directories when both exist', () => {
    // Setup
    const claudeDir = path.join(sourceDir, '.claude')
    const codebuddyDir = path.join(sourceDir, '.codebuddy')
    fs.mkdirSync(claudeDir)
    fs.mkdirSync(codebuddyDir)
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}')
    fs.writeFileSync(path.join(codebuddyDir, 'config.json'), '{}')

    // Execute
    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    // Verify
    expect(result.copied).toHaveLength(2)
    expect(result.copied).toContain('.claude')
    expect(result.copied).toContain('.codebuddy')
    expect(result.skipped).toHaveLength(0)
  })

  it('should use default AGENT_CONFIG_DIRS when configDirs not specified', () => {
    // Verify AGENT_CONFIG_DIRS contains expected values
    expect(AGENT_CONFIG_DIRS).toContain('.claude')
    expect(AGENT_CONFIG_DIRS).toContain('.codebuddy')
  })

  it('should use custom configDirs when specified', () => {
    // Setup
    const customDir = path.join(sourceDir, '.custom')
    fs.mkdirSync(customDir)
    fs.writeFileSync(path.join(customDir, 'config.json'), '{}')

    // Execute with custom configDirs
    const result = copyAgentConfigDirs({
      sourceDir,
      targetDir,
      configDirs: ['.custom'],
    })

    // Verify
    expect(result.copied).toContain('.custom')
    expect(result.copied).not.toContain('.claude')
    expect(fs.existsSync(path.join(targetDir, '.custom', 'config.json'))).toBe(true)
  })
})
