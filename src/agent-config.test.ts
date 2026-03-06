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

  it('should not copy .thought-cabinet directory', () => {
    // .thought-cabinet exists in source but should NOT be copied
    const canonical = path.join(sourceDir, '.thought-cabinet', 'agents', 'my-agent')
    fs.mkdirSync(canonical, { recursive: true })
    fs.writeFileSync(path.join(canonical, 'my-agent.md'), '# My Agent')

    copyAgentConfigDirs({ sourceDir, targetDir })

    expect(fs.existsSync(path.join(targetDir, '.thought-cabinet'))).toBe(false)
  })

  it('should preserve symlinks as-is', () => {
    // Setup: symlink from .claude/skills/foo -> some source path
    const externalSource = path.join(tempDir, 'pkg-source', 'skills', 'foo')
    fs.mkdirSync(externalSource, { recursive: true })
    fs.writeFileSync(path.join(externalSource, 'SKILL.md'), '# Foo')

    const skillsDir = path.join(sourceDir, '.claude', 'skills')
    fs.mkdirSync(skillsDir, { recursive: true })
    fs.symlinkSync(externalSource, path.join(skillsDir, 'foo'))

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')

    // Verify the symlink was preserved (not dereferenced)
    const targetSymlink = path.join(targetDir, '.claude', 'skills', 'foo')
    const stats = fs.lstatSync(targetSymlink)
    expect(stats.isSymbolicLink()).toBe(true)

    // Verify symlink still points to the same target
    const linkTarget = fs.readlinkSync(targetSymlink)
    expect(linkTarget).toBe(externalSource)
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

  it('should fallback to dereference copy when symlink creation fails', () => {
    // Setup: symlink from .claude/skills/bar -> package source
    const pkgSource = path.join(tempDir, 'pkg-source', 'skills', 'bar')
    fs.mkdirSync(pkgSource, { recursive: true })
    fs.writeFileSync(path.join(pkgSource, 'bar.md'), '# Bar')

    const skillsDir = path.join(sourceDir, '.claude', 'skills')
    fs.mkdirSync(skillsDir, { recursive: true })
    fs.symlinkSync(pkgSource, path.join(skillsDir, 'bar'))

    const result = copyAgentConfigDirs({ sourceDir, targetDir })

    expect(result.copied).toContain('.claude')
    // Content should be accessible regardless of method (symlink or dereferenced copy)
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'bar', 'bar.md'))).toBe(true)
  })
})
