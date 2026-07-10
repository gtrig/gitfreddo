import { describe, expect, it } from 'vitest'
import type { AiAnalyzeFeatureGroup } from '@shared/ai'
import {
  groupCommitsByFeatures,
  isFeatureFullySelected,
  isFeaturePartiallySelected,
  toggleFeatureCommitSelection
} from './analyzeFeatures'

const features: AiAnalyzeFeatureGroup[] = [
  { title: 'Auth', commitIndices: [0, 1] },
  { title: 'Docs', commitIndices: [2] }
]

describe('groupCommitsByFeatures', () => {
  it('groups commits under feature titles in order', () => {
    expect(groupCommitsByFeatures(4, features)).toEqual([
      { featureTitle: 'Auth', commitIndices: [0, 1] },
      { featureTitle: 'Docs', commitIndices: [2] },
      { featureTitle: null, commitIndices: [3] }
    ])
  })

  it('returns a single ungrouped section when there are no features', () => {
    expect(groupCommitsByFeatures(2, [])).toEqual([{ featureTitle: null, commitIndices: [0, 1] }])
  })
})

describe('feature selection helpers', () => {
  it('detects full and partial feature selection', () => {
    const selected = new Set([0, 1])
    expect(isFeatureFullySelected(features[0]!, selected)).toBe(true)
    expect(isFeaturePartiallySelected(features[0]!, selected)).toBe(false)

    const partial = new Set([0])
    expect(isFeatureFullySelected(features[0]!, partial)).toBe(false)
    expect(isFeaturePartiallySelected(features[0]!, partial)).toBe(true)
  })

  it('selects all commits in a feature when none are selected', () => {
    const selected = new Set<number>()
    const next = toggleFeatureCommitSelection(selected, features[0]!)
    expect([...next].sort()).toEqual([0, 1])
  })

  it('deselects all commits in a feature when all are selected', () => {
    const selected = new Set([0, 1, 2])
    const next = toggleFeatureCommitSelection(selected, features[0]!)
    expect([...next]).toEqual([2])
  })
})
