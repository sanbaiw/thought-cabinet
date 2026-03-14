import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { planMigration, executeMigration } from '../migrate.js'

async function createLegacySetup(
  homeDir: string,
  opts: {
    config?: Record<string, unknown>
    agents?: boolean
    skills?: boolean
    thoughtsRepo?: string
    profiles?: Record<string, { thoughtsRepo: string }>
  } = {},
): Promise<void> {
  const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')
  await mkdir(legacyConfigDir, { recursive: true })

  const thoughtsRepo = opts.thoughtsRepo || join(homeDir, 'thoughts')
  const config = opts.config || {
    thoughts: {
      thoughtsRepo,
      reposDir: 'repos',
      globalDir: 'global',
      user: 'testuser',
      repoMappings: {},
      ...(opts.profiles ? { profiles: opts.profiles } : {}),
    },
  }

  await writeFile(join(legacyConfigDir, 'config.json'), JSON.stringify(config, null, 2))

  if (opts.agents !== false) {
    await mkdir(join(legacyConfigDir, 'agents', 'analyzer'), { recursive: true })
    await writeFile(join(legacyConfigDir, 'agents', 'analyzer', 'analyzer.md'), '# Analyzer')
  }

  if (opts.skills !== false) {
    await mkdir(join(legacyConfigDir, 'skills', 'commit'), { recursive: true })
    await writeFile(join(legacyConfigDir, 'skills', 'commit', 'SKILL.md'), '# Commit')
  }

  // Create thoughts repo
  await mkdir(join(thoughtsRepo, 'repos'), { recursive: true })
  await mkdir(join(thoughtsRepo, 'global'), { recursive: true })

  // Create profile repos
  if (opts.profiles) {
    for (const [, profile] of Object.entries(opts.profiles)) {
      await mkdir(join(profile.thoughtsRepo, 'repos'), { recursive: true })
      await mkdir(join(profile.thoughtsRepo, 'global'), { recursive: true })
    }
  }
}

describe('planMigration', () => {
  let homeDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'migrate-plan-'))
    process.env.HOME = homeDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(homeDir, { recursive: true, force: true })
  })

  it('returns null when no legacy config exists', async () => {
    const result = planMigration(homeDir)
    expect(result).toBeNull()
  })

  it('returns null when already at new location', async () => {
    const newConfigDir = join(homeDir, '.thought-cabinet')
    await mkdir(newConfigDir, { recursive: true })
    await writeFile(
      join(newConfigDir, 'config.json'),
      JSON.stringify({ thoughts: { thoughtsRepo: join(newConfigDir, 'thoughts') } }),
    )

    const result = planMigration(homeDir)
    expect(result).toBeNull()
  })

  it('plans config file move from legacy to new location', async () => {
    await createLegacySetup(homeDir, { agents: false, skills: false })

    const result = planMigration(homeDir)

    expect(result).not.toBeNull()
    expect(result!.moves).toContainEqual(
      expect.objectContaining({
        from: join(homeDir, '.config', 'thought-cabinet', 'config.json'),
        to: join(homeDir, '.thought-cabinet', 'config.json'),
        label: 'Config file',
      }),
    )
  })

  it('plans agent assets directories move', async () => {
    await createLegacySetup(homeDir)

    const result = planMigration(homeDir)

    expect(result).not.toBeNull()
    const labels = result!.moves.map(m => m.label)
    expect(labels).toContain('agents/ directory')
    expect(labels).toContain('skills/ directory')
  })

  it('plans default thoughts repo move', async () => {
    await createLegacySetup(homeDir)

    const result = planMigration(homeDir)

    expect(result).not.toBeNull()
    expect(result!.moves).toContainEqual(
      expect.objectContaining({
        from: join(homeDir, 'thoughts'),
        to: join(homeDir, '.thought-cabinet', 'thoughts'),
      }),
    )
  })

  it('plans profile thoughts repo moves', async () => {
    const workRepo = join(homeDir, 'thoughts-work')
    await createLegacySetup(homeDir, {
      profiles: {
        work: { thoughtsRepo: workRepo, reposDir: 'repos', globalDir: 'global' } as never,
      },
    })

    const result = planMigration(homeDir)

    expect(result).not.toBeNull()
    expect(result!.moves).toContainEqual(
      expect.objectContaining({
        from: workRepo,
        to: join(homeDir, '.thought-cabinet', 'thoughts-work'),
      }),
    )
  })

  it('skips repos already inside new config dir', async () => {
    const newConfigDir = join(homeDir, '.thought-cabinet')
    const thoughtsRepo = join(newConfigDir, 'thoughts')
    await createLegacySetup(homeDir, { thoughtsRepo })

    const result = planMigration(homeDir)

    expect(result).not.toBeNull()
    // Should not have a move for the thoughts repo since it's already at the target
    const thoughtsMoves = result!.moves.filter(m => m.label.includes('thoughts repo'))
    expect(thoughtsMoves).toHaveLength(0)
  })
})

describe('executeMigration', () => {
  let homeDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'migrate-exec-'))
    process.env.HOME = homeDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(homeDir, { recursive: true, force: true })
  })

  it('moves config file to new location', async () => {
    await createLegacySetup(homeDir, { agents: false, skills: false })

    const plan = planMigration(homeDir)!
    executeMigration(plan)

    expect(existsSync(join(homeDir, '.thought-cabinet', 'config.json'))).toBe(true)
    expect(existsSync(join(homeDir, '.config', 'thought-cabinet', 'config.json'))).toBe(false)
  })

  it('moves agent assets directories', async () => {
    await createLegacySetup(homeDir)

    const plan = planMigration(homeDir)!
    executeMigration(plan)

    expect(existsSync(join(homeDir, '.thought-cabinet', 'agents', 'analyzer', 'analyzer.md'))).toBe(
      true,
    )
    expect(existsSync(join(homeDir, '.thought-cabinet', 'skills', 'commit', 'SKILL.md'))).toBe(
      true,
    )
  })

  it('moves thoughts repos', async () => {
    await createLegacySetup(homeDir)

    const plan = planMigration(homeDir)!
    executeMigration(plan)

    expect(existsSync(join(homeDir, '.thought-cabinet', 'thoughts', 'repos'))).toBe(true)
    expect(existsSync(join(homeDir, '.thought-cabinet', 'thoughts', 'global'))).toBe(true)
    expect(existsSync(join(homeDir, 'thoughts'))).toBe(false)
  })

  it('updates config paths after move', async () => {
    await createLegacySetup(homeDir)

    const plan = planMigration(homeDir)!
    executeMigration(plan)

    const configPath = join(homeDir, '.thought-cabinet', 'config.json')
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.thoughts.thoughtsRepo).toBe(join(homeDir, '.thought-cabinet', 'thoughts'))
  })

  it('updates profile paths in config after move', async () => {
    const workRepo = join(homeDir, 'thoughts-work')
    await createLegacySetup(homeDir, {
      profiles: {
        work: { thoughtsRepo: workRepo, reposDir: 'repos', globalDir: 'global' } as never,
      },
    })

    const plan = planMigration(homeDir)!
    executeMigration(plan)

    const configPath = join(homeDir, '.thought-cabinet', 'config.json')
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    expect(config.thoughts.profiles.work.thoughtsRepo).toBe(
      join(homeDir, '.thought-cabinet', 'thoughts-work'),
    )
  })

  it('reports affected repos from repoMappings', async () => {
    const config = {
      thoughts: {
        thoughtsRepo: join(homeDir, 'thoughts'),
        reposDir: 'repos',
        globalDir: 'global',
        user: 'testuser',
        repoMappings: {
          '/home/user/project-a': 'project-a',
          '/home/user/project-b': 'project-b',
        },
      },
    }
    await createLegacySetup(homeDir, { config })

    const plan = planMigration(homeDir)!
    expect(plan.affectedRepos).toEqual(['/home/user/project-a', '/home/user/project-b'])
  })
})
