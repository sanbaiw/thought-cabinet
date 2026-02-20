#!/usr/bin/env node

// Show completion hint after installation
// Skip in CI environments to avoid polluting CI logs
const isCI = process.env.CI === 'true' ||
             process.env.CONTINUOUS_INTEGRATION === 'true' ||
             process.env.GITHUB_ACTIONS === 'true'

if (!isCI) {
  console.log('')
  console.log('  \x1b[36mthought-cabinet\x1b[0m installed successfully!')
  console.log('')
  console.log('  To enable shell tab completion, run:')
  console.log('    \x1b[36mthc completion install\x1b[0m')
  console.log('')
}
