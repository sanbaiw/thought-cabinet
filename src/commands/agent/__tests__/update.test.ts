import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { updateBundledAssets, detectInstallTargets } from '../update.js'

describe('updateBundledAssets', () => {
  let tmpDir: string
  let configDir: string
  let bundledDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'skill-update-'))
    configDir = join(tmpDir, 'config')
    bundledDir = join(tmpDir, 'bundled')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('overwrites bundled assets', async () => {
    mkdirSync(join(bundledDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(join(bundledDir, 'skills', 'commit', 'SKILL.md'), 'new content')

    mkdirSync(join(configDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(join(configDir, 'skills', 'commit', 'SKILL.md'), 'old content')

    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.seeded).toContain('skills/commit')
    expect(readFileSync(join(configDir, 'skills', 'commit', 'SKILL.md'), 'utf8')).toBe(
      'new content',
    )
  })

  it('preserves user-added assets', async () => {
    mkdirSync(join(bundledDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(join(bundledDir, 'skills', 'commit', 'SKILL.md'), 'bundled')

    mkdirSync(join(configDir, 'skills', 'commit'), { recursive: true })
    mkdirSync(join(configDir, 'skills', 'my-custom'), { recursive: true })
    writeFileSync(join(configDir, 'skills', 'my-custom', 'SKILL.md'), 'custom content')

    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.skipped).toContain('skills/my-custom')
    expect(readFileSync(join(configDir, 'skills', 'my-custom', 'SKILL.md'), 'utf8')).toBe(
      'custom content',
    )
  })

  it('handles missing bundled category dir', async () => {
    mkdirSync(bundledDir, { recursive: true })
    // No skills/ or agents/ in bundled dir

    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.seeded).toEqual([])
    expect(result.skipped).toEqual([])
  })

  it('handles empty config dir (first run)', async () => {
    mkdirSync(join(bundledDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(
      join(bundledDir, 'skills', 'commit', 'SKILL.md'),
      '---\nname: commit\ndescription: Commit\n---\n# Commit',
    )

    // configDir does not exist yet
    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.seeded).toContain('skills/commit')
    expect(existsSync(join(configDir, 'skills', 'commit', 'SKILL.md'))).toBe(true)
  })

  it('returns correct seeded and skipped counts', async () => {
    // Bundled: commit and research
    mkdirSync(join(bundledDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(join(bundledDir, 'skills', 'commit', 'SKILL.md'), 'commit')
    mkdirSync(join(bundledDir, 'skills', 'research'), { recursive: true })
    writeFileSync(join(bundledDir, 'skills', 'research', 'SKILL.md'), 'research')

    // Config: commit (old), custom-a, custom-b
    mkdirSync(join(configDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(join(configDir, 'skills', 'commit', 'SKILL.md'), 'old')
    mkdirSync(join(configDir, 'skills', 'custom-a'), { recursive: true })
    mkdirSync(join(configDir, 'skills', 'custom-b'), { recursive: true })

    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.seeded).toHaveLength(2)
    expect(result.seeded).toContain('skills/commit')
    expect(result.seeded).toContain('skills/research')
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped).toContain('skills/custom-a')
    expect(result.skipped).toContain('skills/custom-b')
  })

  it('skips non-directory entries in bundled dir', async () => {
    mkdirSync(join(bundledDir, 'skills'), { recursive: true })
    writeFileSync(join(bundledDir, 'skills', 'README.md'), '# Skills')

    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.seeded).toEqual([])
    expect(existsSync(join(configDir, 'skills', 'README.md'))).toBe(false)
  })

  it('handles both agents and skills categories', async () => {
    mkdirSync(join(bundledDir, 'skills', 'commit'), { recursive: true })
    writeFileSync(join(bundledDir, 'skills', 'commit', 'SKILL.md'), 'skill')
    mkdirSync(join(bundledDir, 'agents', 'analyzer'), { recursive: true })
    writeFileSync(join(bundledDir, 'agents', 'analyzer', 'analyzer.md'), 'agent')

    const result = await updateBundledAssets(configDir, bundledDir)

    expect(result.seeded).toContain('skills/commit')
    expect(result.seeded).toContain('agents/analyzer')
    expect(existsSync(join(configDir, 'skills', 'commit', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(configDir, 'agents', 'analyzer', 'analyzer.md'))).toBe(true)
  })
})

describe('detectInstallTargets', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'detect-targets-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty array when no installations exist', async () => {
    const repoPath = join(tmpDir, 'repo')
    mkdirSync(repoPath, { recursive: true })

    const targets = await detectInstallTargets([repoPath])

    // Filter to project-scope only (global dirs may exist on the test machine)
    const projectTargets = targets.filter(t => t.scope === 'project')
    expect(projectTargets).toEqual([])
  })

  it('detects project-scope copy installs', async () => {
    const repoPath = join(tmpDir, 'repo')
    // Create a regular directory (not symlink) in .claude/skills/
    mkdirSync(join(repoPath, '.claude', 'skills', 'commit'), { recursive: true })
    writeFileSync(join(repoPath, '.claude', 'skills', 'commit', 'SKILL.md'), 'content')

    const targets = await detectInstallTargets([repoPath])

    const claudeTarget = targets.find(t => t.agentType === 'claude-code' && t.scope === 'project')
    expect(claudeTarget).toBeDefined()
    expect(claudeTarget!.mode).toBe('copy')
    expect(claudeTarget!.cwd).toBe(repoPath)
  })

  it('detects project-scope symlink installs', async () => {
    const repoPath = join(tmpDir, 'repo')
    // Create a symlink target
    const symlinkTarget = join(tmpDir, 'source', 'commit')
    mkdirSync(symlinkTarget, { recursive: true })
    writeFileSync(join(symlinkTarget, 'SKILL.md'), 'content')

    // Create the skills directory and symlink
    mkdirSync(join(repoPath, '.claude', 'skills'), { recursive: true })
    symlinkSync(symlinkTarget, join(repoPath, '.claude', 'skills', 'commit'))

    const targets = await detectInstallTargets([repoPath])

    const claudeTarget = targets.find(t => t.agentType === 'claude-code' && t.scope === 'project')
    expect(claudeTarget).toBeDefined()
    expect(claudeTarget!.mode).toBe('symlink')
  })

  it('detects mixed modes and uses majority', async () => {
    const repoPath = join(tmpDir, 'repo')
    // 2 symlinks, 1 copy → majority is symlink
    const symlinkTarget1 = join(tmpDir, 'source', 'skill1')
    const symlinkTarget2 = join(tmpDir, 'source', 'skill2')
    mkdirSync(symlinkTarget1, { recursive: true })
    mkdirSync(symlinkTarget2, { recursive: true })

    mkdirSync(join(repoPath, '.claude', 'skills'), { recursive: true })
    symlinkSync(symlinkTarget1, join(repoPath, '.claude', 'skills', 'skill1'))
    symlinkSync(symlinkTarget2, join(repoPath, '.claude', 'skills', 'skill2'))
    mkdirSync(join(repoPath, '.claude', 'skills', 'skill3'), { recursive: true })

    const targets = await detectInstallTargets([repoPath])

    const claudeTarget = targets.find(t => t.agentType === 'claude-code' && t.scope === 'project')
    expect(claudeTarget).toBeDefined()
    expect(claudeTarget!.mode).toBe('symlink')
  })
})
