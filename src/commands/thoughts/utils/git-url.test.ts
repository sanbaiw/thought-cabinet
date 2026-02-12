import { describe, it, expect } from 'vitest'
import { parseGitRemoteUrl, buildFileShareLink } from './git-url.js'

describe('parseGitRemoteUrl', () => {
  it('parses SSH URLs', () => {
    expect(parseGitRemoteUrl('git@github.com:team/thoughts.git')).toEqual({
      host: 'github.com',
      owner: 'team',
      repo: 'thoughts',
    })
  })

  it('parses HTTPS URLs', () => {
    expect(parseGitRemoteUrl('https://github.com/team/thoughts.git')).toEqual({
      host: 'github.com',
      owner: 'team',
      repo: 'thoughts',
    })
  })

  it('parses SSH protocol URLs', () => {
    expect(parseGitRemoteUrl('ssh://git@gitlab.com/team/thoughts.git')).toEqual({
      host: 'gitlab.com',
      owner: 'team',
      repo: 'thoughts',
    })
  })

  it('handles URLs without .git suffix', () => {
    expect(parseGitRemoteUrl('https://github.com/team/thoughts')).toEqual({
      host: 'github.com',
      owner: 'team',
      repo: 'thoughts',
    })
  })

  it('handles self-hosted instances', () => {
    expect(parseGitRemoteUrl('git@git.mycompany.com:org/thoughts.git')).toEqual({
      host: 'git.mycompany.com',
      owner: 'org',
      repo: 'thoughts',
    })
  })

  it('returns null for local paths', () => {
    expect(parseGitRemoteUrl('/home/user/thoughts')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseGitRemoteUrl('')).toBeNull()
  })
})

describe('buildFileShareLink', () => {
  it('builds GitHub file link', () => {
    const parsed = { host: 'github.com', owner: 'team', repo: 'thoughts' }
    expect(buildFileShareLink(parsed, 'main', 'repos/my-project/shared/plan.md')).toBe(
      'https://github.com/team/thoughts/blob/main/repos/my-project/shared/plan.md',
    )
  })

  it('builds GitLab file link', () => {
    const parsed = { host: 'gitlab.com', owner: 'team', repo: 'thoughts' }
    expect(buildFileShareLink(parsed, 'main', 'repos/my-project/shared/plan.md')).toBe(
      'https://gitlab.com/team/thoughts/blob/main/repos/my-project/shared/plan.md',
    )
  })

  it('builds Bitbucket file link with src', () => {
    const parsed = { host: 'bitbucket.org', owner: 'team', repo: 'thoughts' }
    expect(buildFileShareLink(parsed, 'main', 'repos/my-project/shared/plan.md')).toBe(
      'https://bitbucket.org/team/thoughts/src/main/repos/my-project/shared/plan.md',
    )
  })

  it('strips leading slash from path', () => {
    const parsed = { host: 'github.com', owner: 'team', repo: 'thoughts' }
    expect(buildFileShareLink(parsed, 'main', '/repos/project/file.md')).toBe(
      'https://github.com/team/thoughts/blob/main/repos/project/file.md',
    )
  })
})
