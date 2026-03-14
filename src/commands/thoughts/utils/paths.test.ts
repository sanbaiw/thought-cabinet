import { describe, it, expect, afterEach } from 'vitest'

describe('getDefaultThoughtsRepo', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns ~/.thought-cabinet/thoughts by default', async () => {
    delete process.env.XDG_CONFIG_HOME
    process.env.HOME = '/home/testuser'

    const { getDefaultThoughtsRepo } = await import('./paths.js')
    const result = getDefaultThoughtsRepo()
    expect(result).toBe('/home/testuser/.thought-cabinet/thoughts')
  })

  it('returns $XDG_CONFIG_HOME/thought-cabinet/thoughts when XDG is set', async () => {
    process.env.XDG_CONFIG_HOME = '/custom/config'

    const { getDefaultThoughtsRepo } = await import('./paths.js')
    const result = getDefaultThoughtsRepo()
    expect(result).toBe('/custom/config/thought-cabinet/thoughts')
  })
})
