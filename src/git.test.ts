import { describe, it, expect } from 'vitest'
import { parseWorktreeListPorcelain, getWorktreesBaseDir, validateWorktreeHandle } from './git.js'

describe('parseWorktreeListPorcelain', () => {
  it('should parse empty output', () => {
    expect(parseWorktreeListPorcelain('')).toEqual([])
  })

  it('should parse single worktree', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main`

    const result = parseWorktreeListPorcelain(output)
    expect(result).toEqual([{ worktreePath: '/path/to/repo', branch: 'main', detached: false }])
  })

  it('should parse multiple worktrees', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main

worktree /path/to/repo__worktrees/feature
HEAD def456
branch refs/heads/feature-branch`

    const result = parseWorktreeListPorcelain(output)
    expect(result).toHaveLength(2)
    expect(result[0].branch).toBe('main')
    expect(result[1].branch).toBe('feature-branch')
  })

  it('should handle detached HEAD', () => {
    const output = `worktree /path/to/repo
HEAD abc123
detached`

    const result = parseWorktreeListPorcelain(output)
    expect(result).toEqual([
      { worktreePath: '/path/to/repo', branch: '(detached)', detached: true },
    ])
  })
})

describe('getWorktreesBaseDir', () => {
  it('should return correct base dir', () => {
    expect(getWorktreesBaseDir('/home/user/my-repo')).toBe('/home/user/my-repo__worktrees')
  })

  it('should handle nested paths', () => {
    expect(getWorktreesBaseDir('/home/user/projects/my-repo')).toBe(
      '/home/user/projects/my-repo__worktrees',
    )
  })
})

describe('validateWorktreeHandle', () => {
  it('should accept valid handles', () => {
    expect(() => validateWorktreeHandle('feature')).not.toThrow()
    expect(() => validateWorktreeHandle('feature-123')).not.toThrow()
    expect(() => validateWorktreeHandle('Feature_Name')).not.toThrow()
    expect(() => validateWorktreeHandle('v1.0.0')).not.toThrow()
  })

  it('should reject handles starting with non-alphanumeric', () => {
    expect(() => validateWorktreeHandle('-feature')).toThrow()
    expect(() => validateWorktreeHandle('_feature')).toThrow()
    expect(() => validateWorktreeHandle('.feature')).toThrow()
  })

  it('should reject handles with invalid characters', () => {
    expect(() => validateWorktreeHandle('feature/branch')).toThrow()
    expect(() => validateWorktreeHandle('feature:name')).toThrow()
    expect(() => validateWorktreeHandle('feature name')).toThrow()
  })
})
