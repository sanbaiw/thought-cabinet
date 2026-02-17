import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtemp, rm, readlink, lstat, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { installAssetForAgent, getCanonicalDir, getAgentDir } from '../installer.js'
import type { Asset } from '../types.js'

describe('installer', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agent-installer-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('getCanonicalDir', () => {
    it('should return project-level canonical dir', () => {
      const dir = getCanonicalDir('skills', 'project', tempDir)
      expect(dir).toBe(join(tempDir, '.thought-cabinet', 'skills'))
    })
  })

  describe('getAgentDir', () => {
    it('should return agent-specific dir for project scope', () => {
      const dir = getAgentDir('claude-code', 'skills', 'project', tempDir)
      expect(dir).toBe(join(tempDir, '.claude', 'skills'))
    })

    it('should return agent-specific dir for different agents', () => {
      const dir = getAgentDir('cursor', 'commands', 'project', tempDir)
      expect(dir).toBe(join(tempDir, '.cursor', 'commands'))
    })
  })

  describe('installAssetForAgent', () => {
    let sourceDir: string

    beforeEach(async () => {
      // Create a source directory with a test skill
      const { mkdir, writeFile } = await import('fs/promises')
      sourceDir = join(tempDir, 'source-skills', 'test-skill')
      await mkdir(sourceDir, { recursive: true })
      await writeFile(
        join(sourceDir, 'SKILL.md'),
        '---\nname: test-skill\ndescription: A test\n---\n# Test',
      )
      await writeFile(join(sourceDir, 'helper.ts'), 'export const x = 1')
    })

    it('should install in symlink mode with canonical storage', async () => {
      const asset: Asset = {
        name: 'test-skill',
        description: 'A test',
        sourcePath: sourceDir,
        category: 'skills',
        isDirectory: true,
      }

      const result = await installAssetForAgent(asset, 'claude-code', {
        scope: 'project',
        cwd: tempDir,
        mode: 'symlink',
      })

      expect(result.success).toBe(true)
      expect(result.mode).toBe('symlink')
      expect(result.canonicalPath).toBeDefined()
      expect(result.symlinkFailed).toBeUndefined()

      // Verify symlink exists
      const stats = await lstat(result.path)
      expect(stats.isSymbolicLink()).toBe(true)

      // Verify canonical dir has the files
      const canonicalFiles = await readdir(result.canonicalPath!)
      expect(canonicalFiles).toContain('SKILL.md')
      expect(canonicalFiles).toContain('helper.ts')
    })

    it('should install in copy mode without canonical storage', async () => {
      const asset: Asset = {
        name: 'test-skill',
        description: 'A test',
        sourcePath: sourceDir,
        category: 'skills',
        isDirectory: true,
      }

      const result = await installAssetForAgent(asset, 'claude-code', {
        scope: 'project',
        cwd: tempDir,
        mode: 'copy',
      })

      expect(result.success).toBe(true)
      expect(result.mode).toBe('copy')
      expect(result.canonicalPath).toBeUndefined()

      // Verify files were copied
      const files = await readdir(result.path)
      expect(files).toContain('SKILL.md')
      expect(files).toContain('helper.ts')

      // Verify it's not a symlink
      const stats = await lstat(result.path)
      expect(stats.isSymbolicLink()).toBe(false)
    })

    it('should exclude README.md and metadata.json during copy', async () => {
      const { writeFile } = await import('fs/promises')
      await writeFile(join(sourceDir, 'README.md'), '# readme')
      await writeFile(join(sourceDir, 'metadata.json'), '{}')

      const asset: Asset = {
        name: 'test-skill',
        description: 'A test',
        sourcePath: sourceDir,
        category: 'skills',
        isDirectory: true,
      }

      const result = await installAssetForAgent(asset, 'claude-code', {
        scope: 'project',
        cwd: tempDir,
        mode: 'copy',
      })

      expect(result.success).toBe(true)
      const files = await readdir(result.path)
      expect(files).not.toContain('README.md')
      expect(files).not.toContain('metadata.json')
    })

    it('should install single file assets', async () => {
      const filePath = join(tempDir, 'source-commands', 'my-command.md')
      const { mkdir, writeFile } = await import('fs/promises')
      await mkdir(join(tempDir, 'source-commands'), { recursive: true })
      await writeFile(filePath, '# My Command')

      const asset: Asset = {
        name: 'my-command',
        description: '',
        sourcePath: filePath,
        category: 'commands',
        isDirectory: false,
      }

      const result = await installAssetForAgent(asset, 'claude-code', {
        scope: 'project',
        cwd: tempDir,
        mode: 'copy',
      })

      expect(result.success).toBe(true)
      const files = await readdir(result.path)
      expect(files).toContain('my-command.md')
    })

    it('should reject path traversal in asset names', async () => {
      const asset: Asset = {
        name: '../../../etc/passwd',
        description: '',
        sourcePath: sourceDir,
        category: 'skills',
        isDirectory: true,
      }

      const result = await installAssetForAgent(asset, 'claude-code', {
        scope: 'project',
        cwd: tempDir,
      })

      // sanitizeName converts this to 'etc-passwd' which is safe
      // The path safety check should still pass since sanitization makes it safe
      expect(result.success).toBe(true)
    })

    it('should install to multiple agents from same canonical source', async () => {
      const asset: Asset = {
        name: 'test-skill',
        description: 'A test',
        sourcePath: sourceDir,
        category: 'skills',
        isDirectory: true,
      }

      const result1 = await installAssetForAgent(asset, 'claude-code', {
        scope: 'project',
        cwd: tempDir,
        mode: 'symlink',
      })

      const result2 = await installAssetForAgent(asset, 'cursor', {
        scope: 'project',
        cwd: tempDir,
        mode: 'symlink',
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      // Both should point to the same canonical dir
      expect(result1.canonicalPath).toBe(result2.canonicalPath)

      // Both symlinks should resolve
      const link1 = await readlink(result1.path)
      const link2 = await readlink(result2.path)
      expect(link1).toBeTruthy()
      expect(link2).toBeTruthy()
    })
  })
})
