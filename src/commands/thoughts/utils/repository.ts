import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import {
  generateGitignore,
  generateRepoReadme,
  generateGlobalReadme,
} from '../../../templates/index.js'
import type { ResolvedProfileConfig } from './config.js'
import { expandPath, getRepoThoughtsPath, getGlobalThoughtsPath } from './paths.js'

// Overloaded signatures for ensureThoughtsRepoExists
export function ensureThoughtsRepoExists(config: ResolvedProfileConfig): void
export function ensureThoughtsRepoExists(
  thoughtsRepo: string,
  reposDir: string,
  globalDir: string,
): void
export function ensureThoughtsRepoExists(
  configOrThoughtsRepo: ResolvedProfileConfig | string,
  reposDir?: string,
  globalDir?: string,
): void {
  let thoughtsRepo: string
  let effectiveReposDir: string
  let effectiveGlobalDir: string

  if (typeof configOrThoughtsRepo === 'string') {
    // Legacy signature: (thoughtsRepo, reposDir, globalDir)
    thoughtsRepo = configOrThoughtsRepo
    effectiveReposDir = reposDir!
    effectiveGlobalDir = globalDir!
  } else {
    // New signature: (config)
    thoughtsRepo = configOrThoughtsRepo.thoughtsRepo
    effectiveReposDir = configOrThoughtsRepo.reposDir
    effectiveGlobalDir = configOrThoughtsRepo.globalDir
  }

  const expandedRepo = expandPath(thoughtsRepo)

  // Create thoughts repo if it doesn't exist
  if (!fs.existsSync(expandedRepo)) {
    fs.mkdirSync(expandedRepo, { recursive: true })
  }

  // Create subdirectories
  const expandedRepos = path.join(expandedRepo, effectiveReposDir)
  const expandedGlobal = path.join(expandedRepo, effectiveGlobalDir)

  if (!fs.existsSync(expandedRepos)) {
    fs.mkdirSync(expandedRepos, { recursive: true })
  }

  if (!fs.existsSync(expandedGlobal)) {
    fs.mkdirSync(expandedGlobal, { recursive: true })
  }

  // Check if we're in a git repo (handle both .git directory and .git file for worktrees)
  const gitPath = path.join(expandedRepo, '.git')
  const isGitRepo =
    fs.existsSync(gitPath) && (fs.statSync(gitPath).isDirectory() || fs.statSync(gitPath).isFile())

  if (!isGitRepo) {
    // Initialize as git repo
    execSync('git init', { cwd: expandedRepo })

    // Create initial .gitignore
    const gitignore = generateGitignore()
    fs.writeFileSync(path.join(expandedRepo, '.gitignore'), gitignore)

    // Initial commit
    execSync('git add .gitignore', { cwd: expandedRepo })
    execSync('git commit -m "Initial thoughts repository setup"', { cwd: expandedRepo })
  }
}

// Overloaded signatures for createThoughtsDirectoryStructure
export function createThoughtsDirectoryStructure(
  config: ResolvedProfileConfig,
  repoName: string,
  user: string,
): void
export function createThoughtsDirectoryStructure(
  thoughtsRepo: string,
  reposDir: string,
  globalDir: string,
  repoName: string,
  user: string,
): void
export function createThoughtsDirectoryStructure(
  configOrThoughtsRepo: ResolvedProfileConfig | string,
  reposDirOrRepoName: string,
  globalDirOrUser: string,
  repoName?: string,
  user?: string,
): void {
  let resolvedConfig: { thoughtsRepo: string; reposDir: string; globalDir: string }
  let effectiveRepoName: string
  let effectiveUser: string

  if (typeof configOrThoughtsRepo === 'string') {
    // Legacy signature: (thoughtsRepo, reposDir, globalDir, repoName, user)
    resolvedConfig = {
      thoughtsRepo: configOrThoughtsRepo,
      reposDir: reposDirOrRepoName,
      globalDir: globalDirOrUser,
    }
    effectiveRepoName = repoName!
    effectiveUser = user!
  } else {
    // New signature: (config, repoName, user)
    resolvedConfig = configOrThoughtsRepo
    effectiveRepoName = reposDirOrRepoName
    effectiveUser = globalDirOrUser
  }

  // Create repo-specific directories
  const repoThoughtsPath = getRepoThoughtsPath(
    resolvedConfig.thoughtsRepo,
    resolvedConfig.reposDir,
    effectiveRepoName,
  )
  const repoUserPath = path.join(repoThoughtsPath, effectiveUser)
  const repoSharedPath = path.join(repoThoughtsPath, 'shared')

  // Create global directories
  const globalPath = getGlobalThoughtsPath(resolvedConfig.thoughtsRepo, resolvedConfig.globalDir)
  const globalUserPath = path.join(globalPath, effectiveUser)
  const globalSharedPath = path.join(globalPath, 'shared')

  // Create all directories
  for (const dir of [repoUserPath, repoSharedPath, globalUserPath, globalSharedPath]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Create initial README files
  const repoReadme = generateRepoReadme({
    repoName: effectiveRepoName,
    user: effectiveUser,
  })

  const globalReadme = generateGlobalReadme({
    user: effectiveUser,
  })

  if (!fs.existsSync(path.join(repoThoughtsPath, 'README.md'))) {
    fs.writeFileSync(path.join(repoThoughtsPath, 'README.md'), repoReadme)
  }

  if (!fs.existsSync(path.join(globalPath, 'README.md'))) {
    fs.writeFileSync(path.join(globalPath, 'README.md'), globalReadme)
  }
}
