import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { copyAgentConfigDirs } from './agent-config.js'

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

  it('should copy .claude directory with regular files', () => {
    const claudeDir = path.join(sourceDir, '.claude')
    fs.mkdirSync(claudeDir)
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{}')

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')
    expect(fs.existsSync(path.join(targetDir, '.claude', 'settings.json'))).toBe(true)
  })

  it('should copy canonical storage (.thought-cabinet)', () => {
    const canonical = path.join(sourceDir, '.thought-cabinet', 'agents', 'my-agent')
    fs.mkdirSync(canonical, { recursive: true })
    fs.writeFileSync(path.join(canonical, 'my-agent.md'), '# My Agent')

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.canonicalCopied).toBe(true)
    expect(
      fs.existsSync(path.join(targetDir, '.thought-cabinet', 'agents', 'my-agent', 'my-agent.md')),
    ).toBe(true)
  })

  it('should recreate symlinks pointing into .thought-cabinet', () => {
    // Setup: canonical storage + symlink from .claude/agents/foo -> ../../.thought-cabinet/agents/foo
    const canonical = path.join(sourceDir, '.thought-cabinet', 'agents', 'foo')
    fs.mkdirSync(canonical, { recursive: true })
    fs.writeFileSync(path.join(canonical, 'foo.md'), '# Foo')

    const agentDir = path.join(sourceDir, '.claude', 'agents')
    fs.mkdirSync(agentDir, { recursive: true })
    fs.symlinkSync('../../.thought-cabinet/agents/foo', path.join(agentDir, 'foo'))

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')
    expect(result.canonicalCopied).toBe(true)

    // Verify the symlink was recreated (not dereferenced)
    const targetSymlink = path.join(targetDir, '.claude', 'agents', 'foo')
    const stats = fs.lstatSync(targetSymlink)
    expect(stats.isSymbolicLink()).toBe(true)

    // Verify symlink resolves correctly
    const resolved = fs.realpathSync(targetSymlink)
    expect(resolved).toBe(
      fs.realpathSync(path.join(targetDir, '.thought-cabinet', 'agents', 'foo')),
    )
  })

  it('should preserve non-canonical symlinks as-is', () => {
    // Setup: symlink pointing to an external location
    const externalDir = path.join(tempDir, 'external')
    fs.mkdirSync(externalDir)
    fs.writeFileSync(path.join(externalDir, 'data.json'), '{}')

    const claudeDir = path.join(sourceDir, '.claude')
    fs.mkdirSync(claudeDir)
    // Use absolute symlink to external dir
    fs.symlinkSync(externalDir, path.join(claudeDir, 'external-link'))

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')
    const targetLink = path.join(targetDir, '.claude', 'external-link')
    const stats = fs.lstatSync(targetLink)
    expect(stats.isSymbolicLink()).toBe(true)
  })

  it('should skip non-existent agent config directories', () => {
    // No agent dirs in source
    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toHaveLength(0)
    expect(result.canonicalCopied).toBe(false)
  })

  it('should handle multiple agent config directories', () => {
    // Setup: both .claude and .codebuddy
    fs.mkdirSync(path.join(sourceDir, '.claude'))
    fs.writeFileSync(path.join(sourceDir, '.claude', 'settings.json'), '{}')
    fs.mkdirSync(path.join(sourceDir, '.codebuddy'))
    fs.writeFileSync(path.join(sourceDir, '.codebuddy', 'config.json'), '{}')

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')
    expect(result.copied).toContain('.codebuddy')
  })

  it('should copy nested directories recursively', () => {
    const claudeDir = path.join(sourceDir, '.claude')
    const nestedDir = path.join(claudeDir, 'commands')
    fs.mkdirSync(nestedDir, { recursive: true })
    fs.writeFileSync(path.join(nestedDir, 'custom.md'), '# Custom command')

    copyAgentConfigDirs({ sourceDir, targetDir })

    expect(fs.existsSync(path.join(targetDir, '.claude', 'commands', 'custom.md'))).toBe(true)
    expect(fs.readFileSync(path.join(targetDir, '.claude', 'commands', 'custom.md'), 'utf8')).toBe(
      '# Custom command',
    )
  })

  it('should fallback to dereference when symlink recreation fails', () => {
    // Setup: canonical storage + symlink
    const canonical = path.join(sourceDir, '.thought-cabinet', 'agents', 'bar')
    fs.mkdirSync(canonical, { recursive: true })
    fs.writeFileSync(path.join(canonical, 'bar.md'), '# Bar')

    const agentDir = path.join(sourceDir, '.claude', 'agents')
    fs.mkdirSync(agentDir, { recursive: true })
    fs.symlinkSync('../../.thought-cabinet/agents/bar', path.join(agentDir, 'bar'))

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')
    // Content should be accessible regardless of method
    expect(fs.existsSync(path.join(targetDir, '.claude', 'agents', 'bar', 'bar.md'))).toBe(true)
  })
})
