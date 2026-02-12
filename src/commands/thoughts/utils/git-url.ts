export interface ParsedGitUrl {
  host: string
  owner: string
  repo: string
}

/**
 * Parse a git remote URL into its components.
 *
 * Supports:
 * - SSH: git@github.com:owner/repo.git
 * - HTTPS: https://github.com/owner/repo.git
 * - SSH with protocol: ssh://git@github.com/owner/repo.git
 * - Git protocol: git://github.com/owner/repo.git
 *
 * Returns null if the URL cannot be parsed (e.g., local paths).
 */
export function parseGitRemoteUrl(url: string): ParsedGitUrl | null {
  // Strip trailing .git
  const cleaned = url.trim().replace(/\.git\/?$/, '')

  // SSH format: git@host:owner/repo
  const sshMatch = cleaned.match(/^[\w-]+@([^:]+):(.+?)\/([^/]+)$/)
  if (sshMatch) {
    return { host: sshMatch[1], owner: sshMatch[2], repo: sshMatch[3] }
  }

  // URL format: https://host/owner/repo or ssh://git@host/owner/repo
  try {
    // Normalize ssh://git@host to just extract host
    const normalized = cleaned
      .replace(/^ssh:\/\/[^@]+@/, 'https://')
      .replace(/^git:\/\//, 'https://')
    const parsed = new URL(normalized)
    const parts = parsed.pathname.replace(/^\//, '').split('/')
    if (parts.length >= 2) {
      return { host: parsed.hostname, owner: parts[0], repo: parts[1] }
    }
  } catch {
    // Not a parseable URL
  }

  return null
}

/**
 * Build a browsable HTTPS URL for a file in a git repository.
 *
 * Most platforms (GitHub, GitLab, Gitea, Gogs) use:
 *   https://host/owner/repo/blob/branch/path
 *
 * Bitbucket uses:
 *   https://host/owner/repo/src/branch/path
 */
export function buildFileShareLink(
  parsed: ParsedGitUrl,
  branch: string,
  filePath: string,
): string {
  const pathSegment = parsed.host.includes('bitbucket') ? 'src' : 'blob'
  const cleanPath = filePath.replace(/^\//, '')
  return `https://${parsed.host}/${parsed.owner}/${parsed.repo}/${pathSegment}/${branch}/${cleanPath}`
}
