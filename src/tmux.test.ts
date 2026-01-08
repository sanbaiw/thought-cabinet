import { describe, it, expect } from 'vitest'
import {
  sessionNameForHandle,
  legacySessionNameForHandle,
  allSessionNamesForHandle,
} from './tmux.js'

describe('sessionNameForHandle', () => {
  it('should return prefixed session name', () => {
    expect(sessionNameForHandle('feature')).toBe('thc-feature')
    expect(sessionNameForHandle('my-branch')).toBe('thc-my-branch')
  })
})

describe('legacySessionNameForHandle', () => {
  it('should return legacy prefixed session name', () => {
    expect(legacySessionNameForHandle('feature')).toBe('thc:feature')
    expect(legacySessionNameForHandle('my-branch')).toBe('thc:my-branch')
  })
})

describe('allSessionNamesForHandle', () => {
  it('should return both session name formats', () => {
    const names = allSessionNamesForHandle('feature')
    expect(names).toContain('thc-feature')
    expect(names).toContain('thc:feature')
    expect(names).toHaveLength(2)
  })
})
