import { execSync } from 'child_process'

interface GitInfo {
  repoRoot: string
  repoName: string
  branch: string
  commit: string
}

function getGitInfo(): GitInfo | null {
  try {
    // Check if git is available and we're in a git repo
    execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    const repoRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    const repoName = repoRoot.split('/').pop() || ''

    // Get current branch - try --show-current first, fall back to --abbrev-ref HEAD
    let branch = ''
    try {
      branch = execSync('git branch --show-current', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim()
    } catch {
      try {
        branch = execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim()
      } catch {
        // No branch yet (fresh repo with no commits)
        branch = ''
      }
    }

    // Get commit hash - may fail if no commits yet
    let commit = ''
    try {
      commit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim()
    } catch {
      // No commits yet
      commit = ''
    }

    return { repoRoot, repoName, branch, commit }
  } catch {
    return null
  }
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  // Get timezone name
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${tz}`
}

function formatFilenameTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

export async function specMetadataCommand(): Promise<void> {
  const now = new Date()

  // Output datetime with timezone
  console.log(`Current Date/Time (TZ): ${formatDate(now)}`)

  // Output git info if available
  const gitInfo = getGitInfo()
  if (gitInfo) {
    if (gitInfo.commit) {
      console.log(`Current Git Commit Hash: ${gitInfo.commit}`)
    }
    if (gitInfo.branch) {
      console.log(`Current Branch Name: ${gitInfo.branch}`)
    }
    if (gitInfo.repoName) {
      console.log(`Repository Name: ${gitInfo.repoName}`)
    }
  }

  // Output timestamp suitable for filenames
  console.log(`Timestamp For Filename: ${formatFilenameTimestamp(now)}`)
}
