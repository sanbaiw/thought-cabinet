import path from 'path'
import {
  isGitRepo,
  getCurrentBranch,
  getCurrentCommit,
  getRepoRoot,
} from '../../git.js'

interface GitInfo {
  repoRoot: string
  repoName: string
  branch: string
  commit: string
}

function getGitInfo(): GitInfo | null {
  if (!isGitRepo()) {
    return null
  }

  try {
    const repoRoot = getRepoRoot()
    const repoName = path.basename(repoRoot)
    const branch = getCurrentBranch()
    const commit = getCurrentCommit()

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
