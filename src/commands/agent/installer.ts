import { mkdir, cp, readdir, symlink as fsSymlink, lstat, rm, readlink } from 'fs/promises'
import { join, basename, normalize, resolve, sep, relative, dirname } from 'path'
import { homedir, platform } from 'os'
import type { AgentType, Asset, InstallMode, InstallResult, InstallScope } from './types.js'
import type { AssetCategory } from './constants.js'
import { agents } from './registry.js'
import { AGENTS_DIR, CATEGORY_SUBDIRS } from './constants.js'

export function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
  return sanitized.substring(0, 255) || 'unnamed-asset'
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath))
  const normalizedTarget = normalize(resolve(targetPath))
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase
}

export function getCanonicalDir(
  category: AssetCategory,
  scope: InstallScope,
  cwd?: string,
): string {
  const baseDir = scope === 'global' ? homedir() : cwd || process.cwd()
  return join(baseDir, AGENTS_DIR, CATEGORY_SUBDIRS[category])
}

export function getAgentDir(
  agentType: AgentType,
  category: AssetCategory,
  scope: InstallScope,
  cwd?: string,
): string {
  const agent = agents[agentType]
  const agentBase =
    scope === 'global' && agent.globalConfigDir
      ? agent.globalConfigDir
      : join(cwd || process.cwd(), agent.configDir)
  return join(agentBase, CATEGORY_SUBDIRS[category])
}

async function cleanAndCreateDirectory(dirPath: string): Promise<void> {
  try {
    await rm(dirPath, { recursive: true, force: true })
  } catch {
    // Ignore: directory may not exist
  }
  await mkdir(dirPath, { recursive: true })
}

async function createSymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    const resolvedTarget = resolve(target)
    const resolvedLinkPath = resolve(linkPath)

    if (resolvedTarget === resolvedLinkPath) {
      return true
    }

    // Remove existing entry at link path if present
    try {
      const stats = await lstat(linkPath)
      if (stats.isSymbolicLink()) {
        const existingTarget = await readlink(linkPath)
        const resolvedExisting = resolve(dirname(linkPath), existingTarget)
        if (resolvedExisting === resolvedTarget) {
          return true
        }
        await rm(linkPath)
      } else {
        await rm(linkPath, { recursive: true })
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined
      if (code === 'ELOOP') {
        try {
          await rm(linkPath, { force: true })
        } catch {
          // Will fail at symlink creation below and trigger copy fallback
        }
      }
    }

    const linkDir = dirname(linkPath)
    await mkdir(linkDir, { recursive: true })

    const relativePath = relative(linkDir, target)
    const symlinkType = platform() === 'win32' ? 'junction' : undefined
    await fsSymlink(relativePath, linkPath, symlinkType)
    return true
  } catch {
    return false
  }
}

const EXCLUDE_FILES = new Set(['README.md', 'metadata.json'])
const EXCLUDE_DIRS = new Set(['.git'])

function isExcluded(name: string, isDirectory: boolean): boolean {
  if (name.startsWith('_')) return true
  return isDirectory ? EXCLUDE_DIRS.has(name) : EXCLUDE_FILES.has(name)
}

async function copyDirectoryContents(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })

  await Promise.all(
    entries
      .filter(entry => !isExcluded(entry.name, entry.isDirectory()))
      .map(async entry => {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)
        if (entry.isDirectory()) {
          await copyDirectoryContents(srcPath, destPath)
        } else {
          await cp(srcPath, destPath, { dereference: true, recursive: true })
        }
      }),
  )
}

export async function installAssetForAgent(
  asset: Asset,
  agentType: AgentType,
  options: { scope?: InstallScope; cwd?: string; mode?: InstallMode } = {},
): Promise<InstallResult> {
  const agent = agents[agentType]
  const scope = options.scope ?? 'project'
  const cwd = options.cwd || process.cwd()
  const installMode = options.mode ?? 'symlink'

  if (scope === 'global' && agent.globalConfigDir === undefined) {
    return {
      success: false,
      path: '',
      mode: installMode,
      error: `${agent.displayName} does not support global installation`,
    }
  }

  const assetName = sanitizeName(asset.name)
  const canonicalBase = getCanonicalDir(asset.category, scope, cwd)
  const canonicalDir = join(canonicalBase, assetName)

  const agentBase = getAgentDir(agentType, asset.category, scope, cwd)
  const agentDir = join(agentBase, assetName)

  // Guard against path traversal
  if (!isPathSafe(canonicalBase, canonicalDir) || !isPathSafe(agentBase, agentDir)) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: 'Invalid asset name: potential path traversal detected',
    }
  }

  try {
    const copyAsset = async (targetDir: string) => {
      if (asset.isDirectory) {
        await copyDirectoryContents(asset.sourcePath, targetDir)
      } else {
        await mkdir(targetDir, { recursive: true })
        const fileName = basename(asset.sourcePath)
        await cp(asset.sourcePath, join(targetDir, fileName), { dereference: true })
      }
    }

    if (installMode === 'copy') {
      await cleanAndCreateDirectory(agentDir)
      await copyAsset(agentDir)
      return { success: true, path: agentDir, mode: 'copy' }
    }

    // Symlink mode: copy to canonical dir, then symlink agent dir to it
    await cleanAndCreateDirectory(canonicalDir)
    await copyAsset(canonicalDir)

    const symlinkCreated = await createSymlink(canonicalDir, agentDir)

    if (!symlinkCreated) {
      await cleanAndCreateDirectory(agentDir)
      await copyAsset(agentDir)
      return {
        success: true,
        path: agentDir,
        canonicalPath: canonicalDir,
        mode: 'symlink',
        symlinkFailed: true,
      }
    }

    return {
      success: true,
      path: agentDir,
      canonicalPath: canonicalDir,
      mode: 'symlink',
    }
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
