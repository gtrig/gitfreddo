/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTimelineDragSelect } from './useTimelineDragSelect'
import { makeCommit } from '@/test/fixtures/commit'

describe('useTimelineDragSelect', () => {
  it('starts inactive and exposes overlay ref', () => {
    const scrollRef = { current: document.createElement('div') }
    const commits = [makeCommit(), makeCommit({ hash: 'b'.repeat(40), shortHash: 'bbbbbbb' })]
    const actions = {
      selectTimelineNode: vi.fn(),
      selectCommitRange: vi.fn(),
      selectStash: vi.fn(),
      toggleCommitSelection: vi.fn()
    }

    const { result } = renderHook(() =>
      useTimelineDragSelect({
        scrollRef,
        commits,
        stashes: [],
        prefixHeight: 0,
        rowHeight: 28,
        actions
      })
    )

    expect(result.current.isDragging).toBe(false)
    expect(result.current.overlayRef.current).toBeNull()
  })
})
