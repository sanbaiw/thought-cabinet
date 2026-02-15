import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import {
  parseSkillFrontmatter,
  discoverSkills,
  discoverMarkdownAssets,
  discoverAllAssets,
} from '../discovery.js'

describe('parseSkillFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
name: my-skill
description: A useful skill
---
# My Skill`

    const result = parseSkillFrontmatter(content)
    expect(result).toEqual({
      name: 'my-skill',
      description: 'A useful skill',
    })
  })

  it('should handle quoted values', () => {
    const content = `---
name: "quoted-skill"
description: 'A quoted description'
---`

    const result = parseSkillFrontmatter(content)
    expect(result).toEqual({
      name: 'quoted-skill',
      description: 'A quoted description',
    })
  })

  it('should return null for missing required fields', () => {
    const content = `---
name: only-name
---`

    expect(parseSkillFrontmatter(content)).toBeNull()
  })

  it('should return null for no frontmatter', () => {
    const content = '# Just a markdown file'
    expect(parseSkillFrontmatter(content)).toBeNull()
  })

  it('should return null for empty frontmatter', () => {
    const content = `---
---`

    expect(parseSkillFrontmatter(content)).toBeNull()
  })
})

describe('discoverSkills', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'discovery-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should discover skills with SKILL.md', async () => {
    const skillDir = join(tempDir, 'my-skill')
    await mkdir(skillDir, { recursive: true })
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: A test skill\n---\n# Test',
    )

    const skills = await discoverSkills(tempDir)
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('my-skill')
    expect(skills[0].description).toBe('A test skill')
    expect(skills[0].category).toBe('skills')
    expect(skills[0].isDirectory).toBe(true)
  })

  it('should use directory name when SKILL.md has no valid frontmatter', async () => {
    const skillDir = join(tempDir, 'fallback-skill')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), '# No frontmatter')

    const skills = await discoverSkills(tempDir)
    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('fallback-skill')
    expect(skills[0].description).toBe('')
  })

  it('should skip directories without SKILL.md', async () => {
    const noSkillDir = join(tempDir, 'not-a-skill')
    await mkdir(noSkillDir, { recursive: true })
    await writeFile(join(noSkillDir, 'random.md'), '# Not a skill')

    const skills = await discoverSkills(tempDir)
    expect(skills).toHaveLength(0)
  })

  it('should return empty for non-existent path', async () => {
    const skills = await discoverSkills('/non/existent/path')
    expect(skills).toEqual([])
  })
})

describe('discoverMarkdownAssets', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-discovery-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should discover markdown files', async () => {
    await writeFile(join(tempDir, 'commit.md'), '# Commit command')
    await writeFile(join(tempDir, 'review.md'), '# Review command')

    const assets = await discoverMarkdownAssets(tempDir, 'commands')
    expect(assets).toHaveLength(2)
    expect(assets.map(a => a.name).sort()).toEqual(['commit', 'review'])
    expect(assets[0].category).toBe('commands')
    expect(assets[0].isDirectory).toBe(false)
  })

  it('should extract description from frontmatter', async () => {
    await writeFile(
      join(tempDir, 'plan.md'),
      '---\ndescription: Create implementation plans\n---\n# Plan',
    )

    const assets = await discoverMarkdownAssets(tempDir, 'commands')
    expect(assets).toHaveLength(1)
    expect(assets[0].description).toBe('Create implementation plans')
  })

  it('should skip non-md files', async () => {
    await writeFile(join(tempDir, 'script.ts'), 'export const x = 1')
    await writeFile(join(tempDir, 'readme.txt'), 'text')

    const assets = await discoverMarkdownAssets(tempDir, 'commands')
    expect(assets).toHaveLength(0)
  })

  it('should skip directories', async () => {
    await mkdir(join(tempDir, 'subdir'))
    await writeFile(join(tempDir, 'valid.md'), '# Valid')

    const assets = await discoverMarkdownAssets(tempDir, 'agents')
    expect(assets).toHaveLength(1)
    expect(assets[0].name).toBe('valid')
  })

  it('should return empty for non-existent path', async () => {
    const assets = await discoverMarkdownAssets('/non/existent', 'commands')
    expect(assets).toEqual([])
  })
})

describe('discoverAllAssets', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'all-discovery-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should discover all asset categories', async () => {
    // Create commands
    const commandsDir = join(tempDir, 'commands')
    await mkdir(commandsDir, { recursive: true })
    await writeFile(join(commandsDir, 'commit.md'), '# Commit')

    // Create agents
    const agentsDir = join(tempDir, 'agents')
    await mkdir(agentsDir, { recursive: true })
    await writeFile(join(agentsDir, 'analyzer.md'), '# Analyzer')

    // Create skills
    const skillsDir = join(tempDir, 'skills', 'my-skill')
    await mkdir(skillsDir, { recursive: true })
    await writeFile(
      join(skillsDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: Test\n---\n# Skill',
    )

    const result = await discoverAllAssets(tempDir)
    expect(result.commands).toHaveLength(1)
    expect(result.agents).toHaveLength(1)
    expect(result.skills).toHaveLength(1)
  })

  it('should handle missing category directories gracefully', async () => {
    const result = await discoverAllAssets(tempDir)
    expect(result.commands).toEqual([])
    expect(result.agents).toEqual([])
    expect(result.skills).toEqual([])
  })
})
