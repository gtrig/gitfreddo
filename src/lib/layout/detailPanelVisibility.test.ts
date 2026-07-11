import { describe, expect, it } from 'vitest'
import { shouldShowDetailPanel } from './detailPanelVisibility'

describe('shouldShowDetailPanel', () => {
  it('returns false when not connected', () => {
    expect(shouldShowDetailPanel(false, { kind: 'working', id: 'changes' })).toBe(false)
  })

  it('returns false when nothing is selected', () => {
    expect(shouldShowDetailPanel(true, null)).toBe(false)
  })

  it('returns true for working and merge selections', () => {
    expect(shouldShowDetailPanel(true, { kind: 'working', id: 'changes' })).toBe(true)
    expect(shouldShowDetailPanel(true, { kind: 'merge', id: 'conflicts' })).toBe(true)
  })

  it('returns true for commit selection only when commit exists in graph', () => {
    expect(
      shouldShowDetailPanel(true, { kind: 'commit', id: 'abc' }, { commitExists: true })
    ).toBe(true)
    expect(
      shouldShowDetailPanel(true, { kind: 'commit', id: 'abc' }, { commitExists: false })
    ).toBe(false)
  })
})
