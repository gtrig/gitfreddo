import type { AiAnalyzeFeatureGroup } from '@shared/ai'

export interface AnalyzeCommitSection {
  featureTitle: string | null
  commitIndices: number[]
}

export function groupCommitsByFeatures(
  commitCount: number,
  features: AiAnalyzeFeatureGroup[]
): AnalyzeCommitSection[] {
  if (commitCount <= 0) {
    return []
  }

  const assigned = new Set<number>()
  const sections: AnalyzeCommitSection[] = []

  for (const feature of features) {
    const commitIndices = feature.commitIndices.filter((index) => {
      if (index < 0 || index >= commitCount || assigned.has(index)) {
        return false
      }
      assigned.add(index)
      return true
    })

    if (commitIndices.length === 0) {
      continue
    }

    sections.push({
      featureTitle: feature.title,
      commitIndices
    })
  }

  const ungrouped = Array.from({ length: commitCount }, (_, index) => index).filter(
    (index) => !assigned.has(index)
  )

  if (ungrouped.length > 0) {
    sections.push({
      featureTitle: null,
      commitIndices: ungrouped
    })
  }

  return sections
}

export function isFeatureFullySelected(
  feature: AiAnalyzeFeatureGroup,
  selectedIndices: ReadonlySet<number>
): boolean {
  return (
    feature.commitIndices.length > 0 &&
    feature.commitIndices.every((index) => selectedIndices.has(index))
  )
}

export function isFeaturePartiallySelected(
  feature: AiAnalyzeFeatureGroup,
  selectedIndices: ReadonlySet<number>
): boolean {
  const selectedCount = feature.commitIndices.filter((index) => selectedIndices.has(index)).length
  return selectedCount > 0 && selectedCount < feature.commitIndices.length
}

export function toggleFeatureCommitSelection(
  selectedIndices: ReadonlySet<number>,
  feature: AiAnalyzeFeatureGroup
): Set<number> {
  const next = new Set(selectedIndices)
  const fullySelected = isFeatureFullySelected(feature, selectedIndices)

  if (fullySelected) {
    for (const index of feature.commitIndices) {
      next.delete(index)
    }
  } else {
    for (const index of feature.commitIndices) {
      next.add(index)
    }
  }

  return next
}
