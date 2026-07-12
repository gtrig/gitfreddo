/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { useTimelineDragSelect } from './useTimelineDragSelect'
import { makeCommit } from '@/test/fixtures/commit'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { renderWithProviders } from '@/test/render'

function renderDragHarness(options?: {
  commits?: ReturnType<typeof makeCommit>[]
  stashes?: []
}) {
  const commits =
    options?.commits ??
    [
      makeCommit({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa', subject: 'First' }),
      makeCommit({
        hash: 'b'.repeat(40),
        shortHash: 'bbbbbbb',
        subject: 'Second',
        parents: ['a'.repeat(40)]
      })
    ]
  const actions = {
    selectTimelineNode: vi.fn(),
    selectCommitRange: vi.fn(),
    selectStash: vi.fn(),
    toggleCommitSelection: vi.fn()
  }

  function Harness() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const drag = useTimelineDragSelect({
      scrollRef,
      commits,
      stashes: options?.stashes ?? [],
      prefixHeight: 0,
      rowHeight: 28,
      actions
    })

    return (
      <div ref={scrollRef} data-testid="scroll" style={{ height: 200, overflow: 'auto' }}>
        <div
          data-testid="overlay"
          ref={drag.overlayRef}
          style={{ height: drag.commitRowAreaHeight }}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onClick={drag.onClick}
        />
      </div>
    )
  }

  const view = renderWithProviders(<Harness />)
  const overlay = view.getByTestId('overlay')
  overlay.getBoundingClientRect = () =>
    ({
      top: 100,
      left: 0,
      width: 400,
      height: commits.length * 28,
      bottom: 100 + commits.length * 28,
      right: 400,
      x: 0,
      y: 100,
      toJSON: () => ({})
    }) as DOMRect

  const scroll = view.getByTestId('scroll')
  scroll.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      width: 400,
      height: 200,
      bottom: 200,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }) as DOMRect

  return { ...view, overlay, scroll, actions, commits }
}

describe('useTimelineDragSelect', () => {
  afterEach(() => cleanup())

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

  it('selects a commit on click', async () => {
    const { overlay, actions, commits } = renderDragHarness()
    fireEvent.click(overlay, { clientY: 110 })

    expect(actions.selectTimelineNode).toHaveBeenCalledWith('commit', commits[0]!.hash)
  })

  it('selects a commit range when shift-clicking', () => {
    const { overlay, actions, commits } = renderDragHarness()
    fireEvent.click(overlay, { clientY: 138, shiftKey: true })

    expect(actions.selectCommitRange).toHaveBeenCalledWith(commits[1]!.hash, commits)
  })

  it('toggles commit selection when meta-clicking', () => {
    const { overlay, actions, commits } = renderDragHarness()
    fireEvent.click(overlay, { clientY: 110, metaKey: true })

    expect(actions.toggleCommitSelection).toHaveBeenCalledWith(commits[0]!.hash)
  })
})
