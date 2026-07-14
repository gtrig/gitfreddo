import { describe, expect, it } from 'vitest'
import { buildCommitMessage, parseCommitMessage } from './commitMessage'

describe('buildCommitMessage', () => {
  it('joins summary and description with a blank line', () => {
    expect(buildCommitMessage('feat: add auth', 'Login form')).toBe('feat: add auth\n\nLogin form')
    expect(buildCommitMessage('fix bug', '')).toBe('fix bug')
  })
})

describe('parseCommitMessage', () => {
  it('splits on blank paragraphs', () => {
    expect(parseCommitMessage('feat: add auth\n\nLogin form')).toEqual({
      summary: 'feat: add auth',
      description: 'Login form'
    })
  })

  it('falls back to first-line subject when no blank line', () => {
    expect(parseCommitMessage('subject\nbody line')).toEqual({
      summary: 'subject',
      description: 'body line'
    })
  })

  it('returns summary-only messages', () => {
    expect(parseCommitMessage('just subject')).toEqual({
      summary: 'just subject',
      description: ''
    })
  })
})
