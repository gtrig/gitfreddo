import { describe, expect, it } from 'vitest'
import { formatTimeSince } from './formatTimeSince'

const NOW = Date.parse('2026-07-01T12:00:00.000Z')

describe('formatTimeSince', () => {
  it('returns an em dash for invalid dates', () => {
    expect(formatTimeSince('not-a-date', NOW)).toBe('—')
  })

  it('formats recent commits in seconds or minutes', () => {
    expect(formatTimeSince('2026-07-01T11:59:30.000Z', NOW)).toMatch(/second|minute/i)
  })

  it('formats older commits in larger units', () => {
    expect(formatTimeSince('2026-06-24T12:00:00.000Z', NOW)).toMatch(/week|day/i)
    expect(formatTimeSince('2025-07-01T12:00:00.000Z', NOW)).toMatch(/year|month/i)
  })
})
