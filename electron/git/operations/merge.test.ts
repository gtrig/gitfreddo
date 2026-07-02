import { describe, expect, it } from 'vitest'
import {
  formatMergeFailureMessage,
  parseConflictPathsFromMergeOutput
} from './merge'

describe('mergeStart helpers', () => {
  it('parses conflicted file paths from git merge stderr', () => {
    const text = [
      'Auto-merging README.md',
      'CONFLICT (content): Merge conflict in README.md',
      'Auto-merging fortune.sh',
      'CONFLICT (content): Merge conflict in fortune.sh',
      'Automatic merge failed; fix conflicts and then commit the result.'
    ].join('\n')

    expect(parseConflictPathsFromMergeOutput(text)).toEqual(['README.md', 'fortune.sh'])
  })

  it('formats conflict failures as a short summary', () => {
    const stderr = [
      'CONFLICT (content): Merge conflict in README.md',
      'Automatic merge failed; fix conflicts and then commit the result.'
    ].join('\n')

    expect(formatMergeFailureMessage(stderr, '', 1)).toBe(
      'Merge stopped due to conflicts in: README.md'
    )
  })

  it('falls back to the first non auto-merging line for other failures', () => {
    expect(
      formatMergeFailureMessage('fatal: refusing to merge unrelated histories', '', 128)
    ).toBe('fatal: refusing to merge unrelated histories')
  })
})
