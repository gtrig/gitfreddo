import { describe, expect, it } from 'vitest'
import { BRANCH_COLORS, branchColor, statusColor, statusLabel } from '@/lib/types'

describe('branchColor', () => {
  it('returns a stable color class for a branch name', () => {
    const color = branchColor('feature/login')
    expect(BRANCH_COLORS).toContain(color)
    expect(branchColor('feature/login')).toBe(color)
  })
})

describe('statusLabel', () => {
  it('maps file statuses to single-letter labels', () => {
    expect(statusLabel('added')).toBe('A')
    expect(statusLabel('modified')).toBe('M')
    expect(statusLabel('deleted')).toBe('D')
    expect(statusLabel('renamed')).toBe('R')
    expect(statusLabel('copied')).toBe('C')
    expect(statusLabel('untracked')).toBe('?')
    expect(statusLabel('conflicted')).toBe('U')
  })
})

describe('statusColor', () => {
  it('returns tailwind classes per status', () => {
    expect(statusColor('added')).toContain('emerald')
    expect(statusColor('conflicted')).toContain('orange')
    expect(statusColor('renamed')).toContain('violet')
  })
})
