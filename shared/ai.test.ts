import { describe, expect, it } from 'vitest'
import { buildAiMessages, normalizeBaseUrl } from './ai'

describe('normalizeBaseUrl', () => {
  it('appends /v1 when missing', () => {
    expect(normalizeBaseUrl('http://localhost:1234')).toBe('http://localhost:1234/v1')
  })

  it('preserves existing /v1 suffix', () => {
    expect(normalizeBaseUrl('http://localhost:1234/v1/')).toBe('http://localhost:1234/v1')
  })

  it('returns empty for blank input', () => {
    expect(normalizeBaseUrl('  ')).toBe('')
  })
})

describe('buildAiMessages', () => {
  it('includes seed text when provided', () => {
    const { user } = buildAiMessages('commit_message', { currentText: 'fix auth bug' })
    expect(user).toContain('fix auth bug')
  })

  it('includes branch and files for commit messages', () => {
    const { user } = buildAiMessages('commit_message', {
      branch: 'main',
      filePaths: ['src/auth.ts']
    })
    expect(user).toContain('main')
    expect(user).toContain('src/auth.ts')
  })

  it('includes diff text when provided', () => {
    const { user } = buildAiMessages('stash_message', {
      diffText: '+++ b/README.md\n+hello'
    })
    expect(user).toContain('+++ b/README.md')
  })
})
