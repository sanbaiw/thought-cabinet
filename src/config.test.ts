import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { tmpdir } from 'os'

// We need to mock process.env and fs.existsSync for controlled testing
// Import the module under test after mocking

describe('getDefaultConfigDir', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns ~/.thought-cabinet/ without XDG override', async () => {
    delete process.env.XDG_CONFIG_HOME
    process.env.HOME = '/home/testuser'

    // Re-import to pick up env changes
    const { getDefaultConfigDir } = await import('./config.js')
    const result = getDefaultConfigDir()
    expect(result).toBe('/home/testuser/.thought-cabinet')
  })

  it('returns $XDG_CONFIG_HOME/thought-cabinet when XDG is set', async () => {
    process.env.XDG_CONFIG_HOME = '/custom/config'

    const { getDefaultConfigDir } = await import('./config.js')
    const result = getDefaultConfigDir()
    expect(result).toBe('/custom/config/thought-cabinet')
  })
})

describe('getLegacyConfigDir', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns ~/.config/thought-cabinet/', async () => {
    process.env.HOME = '/home/testuser'

    const { getLegacyConfigDir } = await import('./config.js')
    const result = getLegacyConfigDir()
    expect(result).toBe('/home/testuser/.config/thought-cabinet')
  })
})

describe('resolveConfigDir', () => {
  let tempDir: string
  let newConfigDir: string
  let legacyConfigDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'config-resolve-'))
    newConfigDir = join(tempDir, '.thought-cabinet')
    legacyConfigDir = join(tempDir, '.config', 'thought-cabinet')
    // Point HOME to tempDir so getDefaultConfigDir uses it
    process.env.HOME = tempDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns new location when config.json exists there', async () => {
    await mkdir(newConfigDir, { recursive: true })
    await writeFile(join(newConfigDir, 'config.json'), '{}')

    const { resolveConfigDir } = await import('./config.js')
    const result = resolveConfigDir()
    expect(result).toBe(newConfigDir)
  })

  it('returns legacy location when only old config.json exists', async () => {
    await mkdir(legacyConfigDir, { recursive: true })
    await writeFile(join(legacyConfigDir, 'config.json'), '{}')

    const { resolveConfigDir } = await import('./config.js')
    const result = resolveConfigDir()
    expect(result).toBe(legacyConfigDir)
  })

  it('returns new location when neither exists (fresh install)', async () => {
    const { resolveConfigDir } = await import('./config.js')
    const result = resolveConfigDir()
    expect(result).toBe(newConfigDir)
  })

  it('prefers new location when both exist', async () => {
    await mkdir(newConfigDir, { recursive: true })
    await writeFile(join(newConfigDir, 'config.json'), '{}')
    await mkdir(legacyConfigDir, { recursive: true })
    await writeFile(join(legacyConfigDir, 'config.json'), '{}')

    const { resolveConfigDir } = await import('./config.js')
    const result = resolveConfigDir()
    expect(result).toBe(newConfigDir)
  })
})

describe('getDefaultConfigPath', () => {
  let tempDir: string
  let legacyConfigDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'config-path-'))
    legacyConfigDir = join(tempDir, '.config', 'thought-cabinet')
    process.env.HOME = tempDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(tempDir, { recursive: true, force: true })
  })

  it('uses resolveConfigDir() for the full path', async () => {
    // Set up legacy config so resolveConfigDir falls back
    await mkdir(legacyConfigDir, { recursive: true })
    await writeFile(join(legacyConfigDir, 'config.json'), '{}')

    const { getDefaultConfigPath } = await import('./config.js')
    const result = getDefaultConfigPath()
    expect(result).toBe(join(legacyConfigDir, 'config.json'))
  })

  it('returns new location path for fresh installs', async () => {
    const { getDefaultConfigPath } = await import('./config.js')
    const result = getDefaultConfigPath()
    expect(result).toBe(join(tempDir, '.thought-cabinet', 'config.json'))
  })
})
