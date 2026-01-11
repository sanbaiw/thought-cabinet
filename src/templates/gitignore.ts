/**
 * Generates .gitignore content for thoughts repository
 */
export function generateGitignore(): string {
  return `# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
*.tmp
*.bak
`
}
