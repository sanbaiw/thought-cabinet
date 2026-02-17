import { readdir, readFile } from 'fs/promises'
import { join, basename, extname } from 'path'
import type { Asset } from './types.js'

/** Parse SKILL.md frontmatter to extract name and description */
export function parseSkillFrontmatter(content: string): {
  name: string
  description: string
} | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const data: Record<string, string> = {}

  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      data[key] = value.replace(/^["']|["']$/g, '')
    }
  }

  if (!data.name || !data.description) return null

  return { name: data.name, description: data.description }
}

/** Discover skills from a directory (looks for subdirectories with SKILL.md) */
export async function discoverSkills(basePath: string): Promise<Asset[]> {
  const assets: Asset[] = []

  try {
    const entries = await readdir(basePath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillDir = join(basePath, entry.name)

      try {
        const content = await readFile(join(skillDir, 'SKILL.md'), 'utf-8')
        const parsed = parseSkillFrontmatter(content)

        assets.push({
          name: parsed?.name ?? entry.name,
          description: parsed?.description ?? '',
          sourcePath: skillDir,
          category: 'skills',
          isDirectory: true,
        })
      } catch {
        // No readable SKILL.md in this directory, skip
      }
    }
  } catch {
    // basePath doesn't exist or isn't readable
  }

  return assets
}

/** Discover markdown files from a category directory (commands or agents) */
export async function discoverMarkdownAssets(
  basePath: string,
  category: 'commands' | 'agents',
): Promise<Asset[]> {
  const assets: Asset[] = []

  try {
    const entries = await readdir(basePath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) continue
      if (extname(entry.name) !== '.md') continue

      const filePath = join(basePath, entry.name)
      const name = basename(entry.name, '.md')

      let description = ''
      try {
        const content = await readFile(filePath, 'utf-8')
        const match = content.match(/^---\n([\s\S]*?)\n---/)
        if (match) {
          const descMatch = match[1].match(/description:\s*(.+)/)
          if (descMatch) {
            description = descMatch[1].trim().replace(/^["']|["']$/g, '')
          }
        }
      } catch {
        // Can't read file, use empty description
      }

      assets.push({
        name,
        description,
        sourcePath: filePath,
        category,
        isDirectory: false,
      })
    }
  } catch {
    // basePath doesn't exist
  }

  return assets
}

/** Discover all assets from a source directory (expected layout: agents/, skills/) */
export async function discoverAllAssets(sourcePath: string): Promise<{
  agents: Asset[]
  skills: Asset[]
}> {
  const [agents, skills] = await Promise.all([
    discoverMarkdownAssets(join(sourcePath, 'agents'), 'agents'),
    discoverSkills(join(sourcePath, 'skills')),
  ])

  return { agents, skills }
}
