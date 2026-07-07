import { describe, expect, it } from 'vitest'
import { diffModeAfterLastHunkAction } from '@/lib/diff/hunkStageMode'

describe('diffModeAfterLastHunkAction', () => {
  it('switches to staged after staging the only hunk', () => {
    expect(diffModeAfterLastHunkAction('stage', 1)).toBe('staged')
  })

  it('switches to working after unstaging the only hunk', () => {
    expect(diffModeAfterLastHunkAction('unstage', 1)).toBe('working')
  })

  it('keeps the current diff when more hunks remain', () => {
    expect(diffModeAfterLastHunkAction('stage', 2)).toBeNull()
    expect(diffModeAfterLastHunkAction('unstage', 3)).toBeNull()
  })
})
