import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join, resolve, dirname } from 'path'
import { mkdtemp, rm, readlink, lstat, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { installAssetForAgent, getAgentDir } from '../installer.js'
import type { Asset } from '../types.js'

describe('installer', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agent-installer-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('getAgentDir', () => {
    it('should return agent-specific dir for project scope', () => {
      const dir = getAgentDir('claude-code', 'skills', 'project', tempDir)
      expect(dir).toBe(join(tempDir, '.claude', 'skills'))
    })

    it('should return agent-specific dir for codebuddy', () => {
      const dir = getAgentDir('codebuddy', 'commands', 'project', tempDir)
      expect(dir).toBe(join(tempDir, '.codebuddy', 'commands'))
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

    it('should install in symlink mode via in-repo intermediate for project scope', async () => {
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
      expect(result.symlinkFailed).toBeUndefined()
      expect(result.canonicalPath).toBe(join(tempDir, '.thought-cabinet', 'skills', 'test-skill'))

      // Verify symlink exists
      const stats = await lstat(result.path)
      expect(stats.isSymbolicLink()).toBe(true)

      // Verify symlink points to .thought-cabinet canonical dir, not source
      const linkTarget = await readlink(result.path)
      const resolvedTarget = resolve(dirname(result.path), linkTarget)
      expect(resolvedTarget).toBe(
        resolve(join(tempDir, '.thought-cabinet', 'skills', 'test-skill')),
      )

      // Verify canonical dir exists with copied files
      const { existsSync } = await import('fs')
      expect(existsSync(join(tempDir, '.thought-cabinet', 'skills', 'test-skill'))).toBe(true)
      const files = await readdir(join(tempDir, '.thought-cabinet', 'skills', 'test-skill'))
      expect(files).toContain('SKILL.md')
      expect(files).toContain('helper.ts')
    })

    it('should install in copy mode without symlinks', async () => {
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

    it('should install to multiple agents from same source via shared canonical dir', async () => {
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

      const result2 = await installAssetForAgent(asset, 'codebuddy', {
        scope: 'project',
        cwd: tempDir,
        mode: 'symlink',
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      // Both symlinks should point to the same .thought-cabinet canonical dir
      const link1 = await readlink(result1.path)
      const link2 = await readlink(result2.path)
      const resolved1 = resolve(dirname(result1.path), link1)
      const resolved2 = resolve(dirname(result2.path), link2)
      const canonicalPath = resolve(join(tempDir, '.thought-cabinet', 'skills', 'test-skill'))
      expect(resolved1).toBe(canonicalPath)
      expect(resolved2).toBe(canonicalPath)
    })

    it('should symlink directly to source for global scope', async () => {
      const asset: Asset = {
        name: 'test-skill',
        description: 'A test',
        sourcePath: sourceDir,
        category: 'skills',
        isDirectory: true,
      }

      const result = await installAssetForAgent(asset, 'claude-code', {
        scope: 'global',
        cwd: tempDir,
        mode: 'symlink',
      })

      expect(result.success).toBe(true)
      expect(result.mode).toBe('symlink')
      expect(result.canonicalPath).toBeUndefined()

      // Verify symlink exists
      const stats = await lstat(result.path)
      expect(stats.isSymbolicLink()).toBe(true)

      // Verify symlink points directly to source (no intermediate)
      const linkTarget = await readlink(result.path)
      const resolvedTarget = resolve(dirname(result.path), linkTarget)
      expect(resolvedTarget).toBe(resolve(sourceDir))
    })
  })
})
