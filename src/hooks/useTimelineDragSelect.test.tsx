/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { useTimelineDragSelect } from './useTimelineDragSelect'
import { makeCommit } from '@/test/fixtures/commit'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import type { GitStashEntry } from '@/lib/types'
import { renderWithProviders } from '@/test/render'

function renderDragHarness(options?: {
  commits?: ReturnType<typeof makeCommit>[]
  stashes?: GitStashEntry[]
  onRowContextMenu?: (commit: ReturnType<typeof makeCommit>) => (event: React.MouseEvent) => void
  onCommitDoubleClick?: (commit: ReturnType<typeof makeCommit>) => void
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
          onContextMenu={
            options?.onRowContextMenu
              ? (event) => drag.onContextMenu(event, options.onRowContextMenu!)
              : undefined
          }
          onDoubleClick={
            options?.onCommitDoubleClick
              ? (event) =>
                  drag.onDoubleClick(event, (commit) => {
                    options.onCommitDoubleClick!(commit)
                  })
              : undefined
          }
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
    overlay.setPointerCapture = vi.fn()
    overlay.releasePointerCapture = vi.fn()
    overlay.hasPointerCapture = vi.fn(() => true)

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
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

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

  it('selects stash commits through the overlay click handler', () => {
    const stashHash = 'c'.repeat(40)
    const stashCommit = makeCommit({
      hash: stashHash,
      shortHash: 'ccccccc',
      subject: 'WIP on main',
      refs: ['stash'],
      parents: ['b'.repeat(40)]
    })
    const commits = [
      stashCommit,
      makeCommit({
        hash: 'b'.repeat(40),
        shortHash: 'bbbbbbb',
        subject: 'Second',
        parents: ['a'.repeat(40)]
      }),
      makeCommit({ hash: 'a'.repeat(40), shortHash: 'aaaaaaa', subject: 'First' })
    ]
    const stashes: GitStashEntry[] = [{ index: 0, hash: stashHash, message: 'saved', branch: 'main' }]
    const { overlay, actions } = renderDragHarness({ commits, stashes })

    fireEvent.click(overlay, { clientY: 110 })
    expect(actions.selectStash).toHaveBeenCalledWith(0, stashHash)
  })

  it('forwards context menu events to the row handler', () => {
    const onRowContextMenu = vi.fn(() => vi.fn())
    const { overlay, commits } = renderDragHarness({ onRowContextMenu })

    fireEvent.contextMenu(overlay, { clientY: 138 })
    expect(onRowContextMenu).toHaveBeenCalledWith(commits[1])
  })

  it('toggles commit selection when ctrl-clicking', () => {
    const { overlay, actions, commits } = renderDragHarness()
    fireEvent.click(overlay, { clientY: 110, ctrlKey: true })

    expect(actions.toggleCommitSelection).toHaveBeenCalledWith(commits[0]!.hash)
  })

  it('selects a commit range when dragging across rows', async () => {
    const user = userEvent.setup()
    const { overlay, actions, commits } = renderDragHarness()

    await user.pointer([
      { keys: '[MouseLeft>]', target: overlay, coords: { clientY: 110 } },
      { coords: { clientY: 138 } },
      { keys: '[/MouseLeft]' }
    ])

    expect(actions.selectTimelineNode).toHaveBeenCalledWith('commit', commits[0]!.hash)
    expect(actions.selectCommitRange).toHaveBeenCalledWith(commits[1]!.hash, commits)
  })

  it('forwards double click to the commit handler', () => {
    const onCommitDoubleClick = vi.fn()
    const { overlay, commits } = renderDragHarness({ onCommitDoubleClick })

    fireEvent.doubleClick(overlay, { clientY: 138 })
    expect(onCommitDoubleClick).toHaveBeenCalledWith(commits[1])
  })

  it('clears drag state on pointer cancel', async () => {
    const user = userEvent.setup()
    const { overlay, actions } = renderDragHarness()

    await user.pointer([
      { keys: '[MouseLeft>]', target: overlay, coords: { clientY: 110 } },
      { coords: { clientY: 138 } },
      { keys: '[/MouseLeft]' }
    ])
    actions.selectTimelineNode.mockClear()
    await user.click(overlay)

    expect(actions.selectTimelineNode).toHaveBeenCalledWith('commit', expect.any(String))
  })

  it('starts auto-scroll when dragging near the scroll container edge', async () => {
    const user = userEvent.setup()
    const { overlay } = renderDragHarness()
    const raf = vi.mocked(requestAnimationFrame)

    await user.pointer([
      { keys: '[MouseLeft>]', target: overlay, coords: { clientY: 110 } },
      { coords: { clientY: 8 } }
    ])

    expect(raf).toHaveBeenCalled()
  })
})
