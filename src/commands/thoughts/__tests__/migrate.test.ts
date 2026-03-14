import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join, relative } from 'path'
import { mkdtemp, rm, mkdir, writeFile, readFile, symlink } from 'fs/promises'
import { existsSync, lstatSync, realpathSync } from 'fs'
import { tmpdir } from 'os'
import {
  planMigration,
  executeMigration,
  refreshRepoSymlinks,
  refreshGlobalAgentSymlinks,
  previewGlobalAgentSymlinks,
} from '../migrate.js'

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

describe('refreshRepoSymlinks', () => {
  let homeDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'migrate-repo-symlinks-'))
    process.env.HOME = homeDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(homeDir, { recursive: true, force: true })
  })

  it('refreshes symlinks for repos that exist on disk', async () => {
    const newConfigDir = join(homeDir, '.thought-cabinet')
    const thoughtsRepo = join(newConfigDir, 'thoughts')

    // Create the thoughts repo structure
    await mkdir(join(thoughtsRepo, 'repos', 'my-project', 'testuser'), { recursive: true })
    await mkdir(join(thoughtsRepo, 'repos', 'my-project', 'shared'), { recursive: true })
    await mkdir(join(thoughtsRepo, 'global'), { recursive: true })

    // Create a repo dir with stale thoughts/ symlinks (pointing to old location)
    const repoPath = join(homeDir, 'projects', 'my-project')
    await mkdir(join(repoPath, 'thoughts'), { recursive: true })
    const oldThoughtsRepo = join(homeDir, 'old-location', 'thoughts')
    await mkdir(join(oldThoughtsRepo, 'repos', 'my-project', 'testuser'), { recursive: true })
    await mkdir(join(oldThoughtsRepo, 'repos', 'my-project', 'shared'), { recursive: true })
    await mkdir(join(oldThoughtsRepo, 'global'), { recursive: true })
    await symlink(
      join(oldThoughtsRepo, 'repos', 'my-project', 'testuser'),
      join(repoPath, 'thoughts', 'testuser'),
    )
    await symlink(
      join(oldThoughtsRepo, 'repos', 'my-project', 'shared'),
      join(repoPath, 'thoughts', 'shared'),
    )
    await symlink(join(oldThoughtsRepo, 'global'), join(repoPath, 'thoughts', 'global'))

    // Write config at new location
    await mkdir(newConfigDir, { recursive: true })
    await writeFile(
      join(newConfigDir, 'config.json'),
      JSON.stringify({
        thoughts: {
          thoughtsRepo,
          reposDir: 'repos',
          globalDir: 'global',
          user: 'testuser',
          repoMappings: { [repoPath]: 'my-project' },
        },
      }),
    )

    const config = {
      thoughtsRepo,
      reposDir: 'repos',
      globalDir: 'global',
      user: 'testuser',
      repoMappings: { [repoPath]: 'my-project' } as Record<string, string>,
    }

    const result = refreshRepoSymlinks(config, [repoPath])

    expect(result.refreshed).toContain(repoPath)
    expect(result.skipped).toHaveLength(0)

    // Verify symlinks now point to new location
    const sharedTarget = realpathSync(join(repoPath, 'thoughts', 'shared'))
    expect(sharedTarget).toBe(join(thoughtsRepo, 'repos', 'my-project', 'shared'))
  })

  it('skips repos that do not exist on disk', async () => {
    const config = {
      thoughtsRepo: join(homeDir, '.thought-cabinet', 'thoughts'),
      reposDir: 'repos',
      globalDir: 'global',
      user: 'testuser',
      repoMappings: { '/nonexistent/repo': 'missing-repo' } as Record<string, string>,
    }

    const result = refreshRepoSymlinks(config, ['/nonexistent/repo'])

    expect(result.refreshed).toHaveLength(0)
    expect(result.skipped).toContain('/nonexistent/repo')
  })

  it('returns summary of refreshed and skipped repos', async () => {
    const newConfigDir = join(homeDir, '.thought-cabinet')
    const thoughtsRepo = join(newConfigDir, 'thoughts')

    // Create thoughts repo structure for existing project
    await mkdir(join(thoughtsRepo, 'repos', 'exists', 'testuser'), { recursive: true })
    await mkdir(join(thoughtsRepo, 'repos', 'exists', 'shared'), { recursive: true })
    await mkdir(join(thoughtsRepo, 'global'), { recursive: true })

    // Create one existing repo
    const existingRepo = join(homeDir, 'projects', 'exists')
    await mkdir(existingRepo, { recursive: true })

    const config = {
      thoughtsRepo,
      reposDir: 'repos',
      globalDir: 'global',
      user: 'testuser',
      repoMappings: {
        [existingRepo]: 'exists',
        '/nonexistent/repo': 'gone',
      } as Record<string, string>,
    }

    const result = refreshRepoSymlinks(config, [existingRepo, '/nonexistent/repo'])

    expect(result.refreshed).toEqual([existingRepo])
    expect(result.skipped).toEqual(['/nonexistent/repo'])
  })
})

describe('refreshGlobalAgentSymlinks', () => {
  let homeDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'migrate-agent-symlinks-'))
    process.env.HOME = homeDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(homeDir, { recursive: true, force: true })
  })

  it('recreates symlinks pointing from legacy to new config dir', async () => {
    const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')
    const newConfigDir = join(homeDir, '.thought-cabinet')

    // Create legacy and new skills
    await mkdir(join(legacyConfigDir, 'skills', 'commit'), { recursive: true })
    await writeFile(join(legacyConfigDir, 'skills', 'commit', 'SKILL.md'), '# Commit')
    await mkdir(join(newConfigDir, 'skills', 'commit'), { recursive: true })
    await writeFile(join(newConfigDir, 'skills', 'commit', 'SKILL.md'), '# Commit')

    // Create an agent global dir with a symlink pointing to legacy location
    const agentGlobalDir = join(homeDir, '.test-agent')
    const agentSkillsDir = join(agentGlobalDir, 'skills')
    await mkdir(agentSkillsDir, { recursive: true })

    // Create a relative symlink from agent dir to legacy config dir
    const relPath = relative(agentSkillsDir, join(legacyConfigDir, 'skills', 'commit'))
    await symlink(relPath, join(agentSkillsDir, 'commit'))

    // Verify symlink resolves to legacy location
    const resolvedBefore = realpathSync(join(agentSkillsDir, 'commit'))
    expect(resolvedBefore).toBe(join(legacyConfigDir, 'skills', 'commit'))

    const agents = [
      {
        name: 'test-agent' as const,
        displayName: 'Test Agent',
        configDir: '.test-agent',
        globalConfigDir: agentGlobalDir,
        detectInstalled: async () => true,
      },
    ]

    const result = refreshGlobalAgentSymlinks(legacyConfigDir, newConfigDir, agents)

    expect(result.refreshed).toBe(1)
    expect(result.agents).toContain('Test Agent')

    // Verify symlink now resolves to new location
    const resolvedAfter = realpathSync(join(agentSkillsDir, 'commit'))
    expect(resolvedAfter).toBe(join(newConfigDir, 'skills', 'commit'))
  })

  it('skips entries that are directories (copy mode), not symlinks', async () => {
    const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')
    const newConfigDir = join(homeDir, '.thought-cabinet')

    await mkdir(join(newConfigDir, 'skills', 'commit'), { recursive: true })

    // Create agent dir with a real directory (copy mode), not a symlink
    const agentGlobalDir = join(homeDir, '.test-agent')
    const agentSkillsDir = join(agentGlobalDir, 'skills')
    await mkdir(join(agentSkillsDir, 'commit'), { recursive: true })
    await writeFile(join(agentSkillsDir, 'commit', 'SKILL.md'), '# Commit')

    const agents = [
      {
        name: 'test-agent' as const,
        displayName: 'Test Agent',
        configDir: '.test-agent',
        globalConfigDir: agentGlobalDir,
        detectInstalled: async () => true,
      },
    ]

    const result = refreshGlobalAgentSymlinks(legacyConfigDir, newConfigDir, agents)

    expect(result.refreshed).toBe(0)

    // Verify directory is untouched
    expect(existsSync(join(agentSkillsDir, 'commit', 'SKILL.md'))).toBe(true)
    expect(lstatSync(join(agentSkillsDir, 'commit')).isSymbolicLink()).toBe(false)
  })

  it('handles agents whose global dirs do not exist', async () => {
    const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')
    const newConfigDir = join(homeDir, '.thought-cabinet')

    const agents = [
      {
        name: 'missing-agent' as const,
        displayName: 'Missing Agent',
        configDir: '.missing-agent',
        globalConfigDir: join(homeDir, '.missing-agent'),
        detectInstalled: async () => false,
      },
    ]

    const result = refreshGlobalAgentSymlinks(legacyConfigDir, newConfigDir, agents)

    expect(result.refreshed).toBe(0)
    expect(result.agents).toHaveLength(0)
  })

  it('skips symlinks not pointing into legacy config dir', async () => {
    const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')
    const newConfigDir = join(homeDir, '.thought-cabinet')

    // Create a symlink pointing somewhere unrelated
    const unrelatedDir = join(homeDir, 'unrelated', 'skills', 'custom')
    await mkdir(unrelatedDir, { recursive: true })

    const agentGlobalDir = join(homeDir, '.test-agent')
    const agentSkillsDir = join(agentGlobalDir, 'skills')
    await mkdir(agentSkillsDir, { recursive: true })

    const relPath = relative(agentSkillsDir, unrelatedDir)
    await symlink(relPath, join(agentSkillsDir, 'custom'))

    const agents = [
      {
        name: 'test-agent' as const,
        displayName: 'Test Agent',
        configDir: '.test-agent',
        globalConfigDir: agentGlobalDir,
        detectInstalled: async () => true,
      },
    ]

    const result = refreshGlobalAgentSymlinks(legacyConfigDir, newConfigDir, agents)

    expect(result.refreshed).toBe(0)

    // Verify symlink still points to original location
    const resolved = realpathSync(join(agentSkillsDir, 'custom'))
    expect(resolved).toBe(unrelatedDir)
  })
})

describe('previewGlobalAgentSymlinks', () => {
  let homeDir: string
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'migrate-preview-'))
    process.env.HOME = homeDir
    delete process.env.XDG_CONFIG_HOME
  })

  afterEach(async () => {
    process.env = { ...originalEnv }
    await rm(homeDir, { recursive: true, force: true })
  })

  it('returns paths of symlinks that point into legacy config dir without modifying them', async () => {
    const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')

    // Create legacy skills
    await mkdir(join(legacyConfigDir, 'skills', 'commit'), { recursive: true })
    await writeFile(join(legacyConfigDir, 'skills', 'commit', 'SKILL.md'), '# Commit')

    // Create agent dir with symlink pointing to legacy location
    const agentGlobalDir = join(homeDir, '.test-agent')
    const agentSkillsDir = join(agentGlobalDir, 'skills')
    await mkdir(agentSkillsDir, { recursive: true })

    const relPath = relative(agentSkillsDir, join(legacyConfigDir, 'skills', 'commit'))
    await symlink(relPath, join(agentSkillsDir, 'commit'))

    const agents = [
      {
        name: 'test-agent' as const,
        displayName: 'Test Agent',
        configDir: '.test-agent',
        globalConfigDir: agentGlobalDir,
        detectInstalled: async () => true,
      },
    ]

    const result = previewGlobalAgentSymlinks(legacyConfigDir, agents)

    expect(result).toContain(join(agentSkillsDir, 'commit'))

    // Verify symlink was NOT modified (still points to legacy location)
    const resolved = realpathSync(join(agentSkillsDir, 'commit'))
    expect(resolved).toBe(join(legacyConfigDir, 'skills', 'commit'))
  })

  it('returns empty array when no agent symlinks point to legacy dir', async () => {
    const legacyConfigDir = join(homeDir, '.config', 'thought-cabinet')

    const agents = [
      {
        name: 'test-agent' as const,
        displayName: 'Test Agent',
        configDir: '.test-agent',
        globalConfigDir: join(homeDir, '.test-agent'),
        detectInstalled: async () => true,
      },
    ]

    const result = previewGlobalAgentSymlinks(legacyConfigDir, agents)

    expect(result).toHaveLength(0)
  })
})
