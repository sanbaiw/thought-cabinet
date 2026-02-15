import { describe, it, expect } from 'vitest'
import { sanitizeName } from '../installer.js'

describe('sanitizeName', () => {
  it('should convert to lowercase and replace non-alphanumeric chars with hyphens', () => {
    expect(sanitizeName('My Cool Skill')).toBe('my-cool-skill')
  })

  it('should return unnamed-asset for empty string', () => {
    expect(sanitizeName('')).toBe('unnamed-asset')
  })

  it('should strip path traversal characters', () => {
    expect(sanitizeName('../../etc/passwd')).toBe('etc-passwd')
  })

  it('should strip leading/trailing dots and hyphens', () => {
    expect(sanitizeName('...leading-dots...')).toBe('leading-dots')
  })

  it('should truncate to 255 characters', () => {
    const longName = 'a'.repeat(300)
    expect(sanitizeName(longName)).toHaveLength(255)
  })

  it('should preserve dots and underscores within names', () => {
    expect(sanitizeName('my_skill.v2')).toBe('my_skill.v2')
  })

  it('should handle names with only special characters', () => {
    expect(sanitizeName('---...')).toBe('unnamed-asset')
  })

  it('should handle unicode characters', () => {
    expect(sanitizeName('日本語スキル')).toBe('unnamed-asset')
  })
})
