/**
 * Parameters for generating repository-specific README
 */
export interface RepoReadmeParams {
  repoName: string
  user: string
}

/**
 * Parameters for generating global README
 */
export interface GlobalReadmeParams {
  user: string
}

/**
 * Generates README.md content for repository-specific thoughts directory
 */
export function generateRepoReadme({ repoName, user }: RepoReadmeParams): string {
  return `# ${repoName} Thoughts

This directory contains thoughts and notes specific to the ${repoName} repository.

- \`${user}/\` - Your personal notes for this repository
- \`shared/\` - Team-shared notes for this repository
`
}

/**
 * Generates README.md content for global thoughts directory
 */
export function generateGlobalReadme({ user }: GlobalReadmeParams): string {
  return `# Global Thoughts

This directory contains thoughts and notes that apply across all repositories.

- \`${user}/\` - Your personal cross-repository notes
- \`shared/\` - Team-shared cross-repository notes
`
}
