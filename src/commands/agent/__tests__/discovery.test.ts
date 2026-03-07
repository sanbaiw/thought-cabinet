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

  it('should discover directories containing matching markdown files', async () => {
    await mkdir(join(tempDir, 'commit'), { recursive: true })
    await writeFile(join(tempDir, 'commit', 'commit.md'), '# Commit command')
    await mkdir(join(tempDir, 'review'), { recursive: true })
    await writeFile(join(tempDir, 'review', 'review.md'), '# Review command')

    const assets = await discoverMarkdownAssets(tempDir, 'commands')
    expect(assets).toHaveLength(2)
    expect(assets.map(a => a.name).sort()).toEqual(['commit', 'review'])
    expect(assets[0].category).toBe('commands')
    expect(assets[0].isDirectory).toBe(true)
  })

  it('should extract description from frontmatter', async () => {
    await mkdir(join(tempDir, 'plan'), { recursive: true })
    await writeFile(
      join(tempDir, 'plan', 'plan.md'),
      '---\ndescription: Create implementation plans\n---\n# Plan',
    )

    const assets = await discoverMarkdownAssets(tempDir, 'commands')
    expect(assets).toHaveLength(1)
    expect(assets[0].description).toBe('Create implementation plans')
  })

  it('should skip directories without matching md file', async () => {
    await mkdir(join(tempDir, 'no-match'), { recursive: true })
    await writeFile(join(tempDir, 'no-match', 'other.md'), '# Other')

    const assets = await discoverMarkdownAssets(tempDir, 'commands')
    expect(assets).toHaveLength(0)
  })

  it('should skip flat files (non-directories)', async () => {
    await writeFile(join(tempDir, 'flat.md'), '# Flat file')

    const assets = await discoverMarkdownAssets(tempDir, 'agents')
    expect(assets).toHaveLength(0)
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
    // Create agents (directory-based)
    const agentDir = join(tempDir, 'agents', 'analyzer')
    await mkdir(agentDir, { recursive: true })
    await writeFile(join(agentDir, 'analyzer.md'), '# Analyzer')

    // Create skills
    const skillsDir = join(tempDir, 'skills', 'my-skill')
    await mkdir(skillsDir, { recursive: true })
    await writeFile(
      join(skillsDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: Test\n---\n# Skill',
    )

    const result = await discoverAllAssets(tempDir)
    expect(result.agents).toHaveLength(1)
    expect(result.agents[0].isDirectory).toBe(true)
    expect(result.skills).toHaveLength(1)
  })

  it('should handle missing category directories gracefully', async () => {
    const result = await discoverAllAssets(tempDir)
    expect(result.agents).toEqual([])
    expect(result.skills).toEqual([])
  })
})
