import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { getBundledAssetsDir, bootstrapAssetsIfNeeded, resolveSourceDir } from '../init.js'

/** Create a minimal bundled assets directory structure for testing */
async function createBundledAssets(dir: string): Promise<void> {
  await mkdir(join(dir, 'agents', 'analyzer'), { recursive: true })
  await writeFile(
    join(dir, 'agents', 'analyzer', 'analyzer.md'),
    '---\ndescription: Analyzer agent\n---\n# Analyzer',
  )
  await mkdir(join(dir, 'skills', 'commit'), { recursive: true })
  await writeFile(
    join(dir, 'skills', 'commit', 'SKILL.md'),
    '---\nname: commit\ndescription: Commit skill\n---\n# Commit',
  )
}

describe('getBundledAssetsDir', () => {
  it('should return a path containing agent-assets when bundled assets exist', () => {
    const result = getBundledAssetsDir()
    expect(result).not.toBeNull()
    expect(result).toContain('agent-assets')
    expect(existsSync(result!)).toBe(true)
  })
})

describe('bootstrapAssetsIfNeeded', () => {
  let tempConfigDir: string
  let tempBundledDir: string

  beforeEach(async () => {
    tempConfigDir = await mkdtemp(join(tmpdir(), 'bootstrap-config-'))
    tempBundledDir = await mkdtemp(join(tmpdir(), 'bootstrap-bundled-'))
    await createBundledAssets(tempBundledDir)
  })

  afterEach(async () => {
    await rm(tempConfigDir, { recursive: true, force: true })
    await rm(tempBundledDir, { recursive: true, force: true })
  })

  it('should copy bundled assets to config dir when asset subdirs are missing', async () => {
    const result = await bootstrapAssetsIfNeeded(tempConfigDir, tempBundledDir)

    expect(result).toBe(tempConfigDir)
    expect(existsSync(join(tempConfigDir, 'agents', 'analyzer', 'analyzer.md'))).toBe(true)
    expect(existsSync(join(tempConfigDir, 'skills', 'commit', 'SKILL.md'))).toBe(true)
  })

  it('should not touch config dir when agents/ already exists', async () => {
    await mkdir(join(tempConfigDir, 'agents', 'custom-agent'), { recursive: true })
    await writeFile(join(tempConfigDir, 'agents', 'custom-agent', 'custom.md'), '# Custom')

    const result = await bootstrapAssetsIfNeeded(tempConfigDir, tempBundledDir)

    expect(result).toBe(tempConfigDir)
    expect(existsSync(join(tempConfigDir, 'agents', 'analyzer'))).toBe(false)
    expect(existsSync(join(tempConfigDir, 'agents', 'custom-agent', 'custom.md'))).toBe(true)
  })

  it('should not touch config dir when skills/ already exists', async () => {
    await mkdir(join(tempConfigDir, 'skills', 'custom-skill'), { recursive: true })
    await writeFile(
      join(tempConfigDir, 'skills', 'custom-skill', 'SKILL.md'),
      '---\nname: custom\ndescription: Custom\n---\n# Custom',
    )

    const result = await bootstrapAssetsIfNeeded(tempConfigDir, tempBundledDir)

    expect(result).toBe(tempConfigDir)
    expect(existsSync(join(tempConfigDir, 'skills', 'commit'))).toBe(false)
  })

  it('should return null when bundled dir is null', async () => {
    const result = await bootstrapAssetsIfNeeded(tempConfigDir, null)
    expect(result).toBeNull()
  })

  it('should handle missing category directories in bundled source gracefully', async () => {
    const sparseBundled = await mkdtemp(join(tmpdir(), 'sparse-bundled-'))
    try {
      await mkdir(join(sparseBundled, 'skills', 'only-skill'), { recursive: true })
      await writeFile(
        join(sparseBundled, 'skills', 'only-skill', 'SKILL.md'),
        '---\nname: only-skill\ndescription: Only\n---\n# Only',
      )

      const result = await bootstrapAssetsIfNeeded(tempConfigDir, sparseBundled)

      expect(result).toBe(tempConfigDir)
      expect(existsSync(join(tempConfigDir, 'skills', 'only-skill', 'SKILL.md'))).toBe(true)
      expect(existsSync(join(tempConfigDir, 'agents'))).toBe(false)
    } finally {
      await rm(sparseBundled, { recursive: true, force: true })
    }
  })

  it('should only copy directories, not loose files in category dirs', async () => {
    await writeFile(join(tempBundledDir, 'skills', 'README.md'), '# Skills')

    const result = await bootstrapAssetsIfNeeded(tempConfigDir, tempBundledDir)

    expect(result).toBe(tempConfigDir)
    expect(existsSync(join(tempConfigDir, 'skills', 'README.md'))).toBe(false)
    expect(existsSync(join(tempConfigDir, 'skills', 'commit', 'SKILL.md'))).toBe(true)
  })
})

describe('resolveSourceDir', () => {
  let tempConfigDir: string
  let tempBundledDir: string
  let tempSourceDir: string

  beforeEach(async () => {
    tempConfigDir = await mkdtemp(join(tmpdir(), 'resolve-config-'))
    tempBundledDir = await mkdtemp(join(tmpdir(), 'resolve-bundled-'))
    tempSourceDir = await mkdtemp(join(tmpdir(), 'resolve-source-'))

    await createBundledAssets(tempBundledDir)

    await mkdir(join(tempSourceDir, 'skills', 'custom'), { recursive: true })
    await writeFile(
      join(tempSourceDir, 'skills', 'custom', 'SKILL.md'),
      '---\nname: custom\ndescription: Custom\n---\n# Custom',
    )
  })

  afterEach(async () => {
    await rm(tempConfigDir, { recursive: true, force: true })
    await rm(tempBundledDir, { recursive: true, force: true })
    await rm(tempSourceDir, { recursive: true, force: true })
  })

  it('should return --source path when provided (priority 1)', async () => {
    const result = await resolveSourceDir(tempSourceDir, tempConfigDir, tempBundledDir)
    expect(result).toBe(tempSourceDir)
  })

  it('should return null for non-existent --source path', async () => {
    const result = await resolveSourceDir('/non/existent/path', tempConfigDir, tempBundledDir)
    expect(result).toBeNull()
  })

  it('should return config dir when it has agents/ subdir (priority 2)', async () => {
    await mkdir(join(tempConfigDir, 'agents', 'my-agent'), { recursive: true })

    const result = await resolveSourceDir(undefined, tempConfigDir, tempBundledDir)
    expect(result).toBe(tempConfigDir)
  })

  it('should return config dir when it has skills/ subdir (priority 2)', async () => {
    await mkdir(join(tempConfigDir, 'skills', 'my-skill'), { recursive: true })

    const result = await resolveSourceDir(undefined, tempConfigDir, tempBundledDir)
    expect(result).toBe(tempConfigDir)
  })

  it('should bootstrap and return config dir when config dir has no asset subdirs (priority 3)', async () => {
    const result = await resolveSourceDir(undefined, tempConfigDir, tempBundledDir)

    expect(result).toBe(tempConfigDir)
    expect(existsSync(join(tempConfigDir, 'agents', 'analyzer'))).toBe(true)
    expect(existsSync(join(tempConfigDir, 'skills', 'commit'))).toBe(true)
  })

  it('should return null when bundled dir is null and config dir is empty (priority 4)', async () => {
    const result = await resolveSourceDir(undefined, tempConfigDir, null)
    expect(result).toBeNull()
  })

  it('should prefer --source over config dir even if config dir has assets', async () => {
    await mkdir(join(tempConfigDir, 'skills', 'existing'), { recursive: true })

    const result = await resolveSourceDir(tempSourceDir, tempConfigDir, tempBundledDir)
    expect(result).toBe(tempSourceDir)
  })

  it('should use config dir after bootstrap without re-bootstrapping on subsequent calls', async () => {
    // First call triggers bootstrap
    await resolveSourceDir(undefined, tempConfigDir, tempBundledDir)
    expect(existsSync(join(tempConfigDir, 'skills', 'commit'))).toBe(true)

    // User adds a custom skill
    await mkdir(join(tempConfigDir, 'skills', 'my-custom-skill'), { recursive: true })
    await writeFile(
      join(tempConfigDir, 'skills', 'my-custom-skill', 'SKILL.md'),
      '---\nname: my-custom-skill\ndescription: Custom\n---\n# Custom',
    )

    // Second call uses config dir directly (priority 2), preserving custom skill
    const result = await resolveSourceDir(undefined, tempConfigDir, tempBundledDir)
    expect(result).toBe(tempConfigDir)
    expect(existsSync(join(tempConfigDir, 'skills', 'my-custom-skill', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(tempConfigDir, 'skills', 'commit', 'SKILL.md'))).toBe(true)
  })
})
