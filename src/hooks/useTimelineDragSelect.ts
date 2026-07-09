import { useCallback, useEffect, useRef, useState } from 'react'
import type { GitCommit, GitStashEntry } from '@/lib/types'
import { isStashCommit, resolveStashEntry } from '@/lib/git/stashCommit'
import {
  commitIndexFromPointerY,
  hasExceededDragThreshold,
  isPointerOverCommitArea
} from '@/lib/timeline/timelinePointerSelection'

const AUTO_SCROLL_EDGE_PX = 24
const AUTO_SCROLL_STEP_PX = 10

type DragSelectActions = {
  selectTimelineNode: (kind: 'commit', id: string) => void
  selectCommitRange: (toHash: string, commits: GitCommit[]) => void
  selectStash: (index: number, hash: string) => void
  toggleCommitSelection: (hash: string) => void
}

export function useTimelineDragSelect({
  scrollRef,
  commits,
  stashes,
  prefixHeight,
  rowHeight,
  actions
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>
  commits: GitCommit[]
  stashes: GitStashEntry[] | undefined
  prefixHeight: number
  rowHeight: number
  actions: DragSelectActions
}) {
  const [isDragging, setIsDragging] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const anchorIndexRef = useRef<number | null>(null)
  const startClientYRef = useRef(0)
  const didDragRef = useRef(false)
  const autoScrollFrameRef = useRef<number | null>(null)
  const lastClientYRef = useRef(0)

  const commitIndexAtClientY = useCallback(
    (clientY: number) => {
      const overlay = overlayRef.current
      if (!overlay) return 0

      return commitIndexFromPointerY({
        clientY,
        areaTop: overlay.getBoundingClientRect().top,
        rowHeight,
        rowCount: commits.length
      })
    },
    [commits.length, rowHeight]
  )

  const isPointerOverCommitRows = useCallback(
    (clientY: number) => {
      const overlay = overlayRef.current
      if (!overlay || commits.length === 0) return false

      const rect = overlay.getBoundingClientRect()
      return isPointerOverCommitArea(clientY, rect.top, rect.height)
    },
    [commits.length]
  )

  const commitAtClientY = useCallback(
    (clientY: number) => {
      const index = commitIndexAtClientY(clientY)
      return commits[index] ?? null
    },
    [commitIndexAtClientY, commits]
  )

  const selectCommitAtIndex = useCallback(
    (index: number, extendRange: boolean) => {
      const commit = commits[index]
      if (!commit) return

      if (isStashCommit(commit)) {
        const stashEntry = resolveStashEntry(commit, stashes)
        if (stashEntry) {
          actions.selectStash(stashEntry.index, stashEntry.hash)
        }
        return
      }

      if (extendRange) {
        actions.selectCommitRange(commit.hash, commits)
        return
      }

      actions.selectTimelineNode('commit', commit.hash)
    },
    [actions, commits, stashes]
  )

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current != null) {
      cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = null
    }
  }, [])

  const updateDragSelection = useCallback(
    (clientY: number, shiftKey: boolean) => {
      const anchorIndex = anchorIndexRef.current
      if (anchorIndex == null) return

      const index = commitIndexAtClientY(clientY)
      if (!didDragRef.current) {
        didDragRef.current = true
        setIsDragging(true)
        if (!shiftKey) {
          selectCommitAtIndex(anchorIndex, false)
        }
      }

      selectCommitAtIndex(index, true)
    },
    [commitIndexAtClientY, selectCommitAtIndex]
  )

  const startAutoScroll = useCallback(
    (shiftKey: boolean) => {
      stopAutoScroll()

      const tick = () => {
        const container = scrollRef.current
        if (!container || anchorIndexRef.current == null) return

        const rect = container.getBoundingClientRect()
        const clientY = lastClientYRef.current

        if (clientY < rect.top + AUTO_SCROLL_EDGE_PX) {
          container.scrollTop -= AUTO_SCROLL_STEP_PX
        } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE_PX) {
          container.scrollTop += AUTO_SCROLL_STEP_PX
        }

        updateDragSelection(clientY, shiftKey)
        autoScrollFrameRef.current = requestAnimationFrame(tick)
      }

      autoScrollFrameRef.current = requestAnimationFrame(tick)
    },
    [scrollRef, stopAutoScroll, updateDragSelection]
  )

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      if (commits.length === 0) return
      if (!isPointerOverCommitRows(event.clientY)) return

      anchorIndexRef.current = commitIndexAtClientY(event.clientY)
      startClientYRef.current = event.clientY
      lastClientYRef.current = event.clientY
      didDragRef.current = false
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [commitIndexAtClientY, commits.length, isPointerOverCommitRows]
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (anchorIndexRef.current == null) return
      lastClientYRef.current = event.clientY

      if (!hasExceededDragThreshold(startClientYRef.current, event.clientY)) return

      updateDragSelection(event.clientY, event.shiftKey)

      const container = scrollRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const nearEdge =
        event.clientY < rect.top + AUTO_SCROLL_EDGE_PX ||
        event.clientY > rect.bottom - AUTO_SCROLL_EDGE_PX

      if (nearEdge && autoScrollFrameRef.current == null) {
        startAutoScroll(event.shiftKey)
      } else if (!nearEdge) {
        stopAutoScroll()
      }
    },
    [scrollRef, startAutoScroll, stopAutoScroll, updateDragSelection]
  )

  const resetDragState = useCallback(() => {
    anchorIndexRef.current = null
    stopAutoScroll()
    if (didDragRef.current) {
      window.setTimeout(() => {
        didDragRef.current = false
        setIsDragging(false)
      }, 0)
      return
    }
    setIsDragging(false)
  }, [stopAutoScroll])

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (anchorIndexRef.current == null) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      resetDragState()
    },
    [resetDragState]
  )

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      resetDragState()
    },
    [resetDragState]
  )

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (didDragRef.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (!isPointerOverCommitRows(event.clientY)) return

      const commit = commitAtClientY(event.clientY)
      if (!commit) return

      if (isStashCommit(commit)) {
        const stashEntry = resolveStashEntry(commit, stashes)
        if (stashEntry) {
          actions.selectStash(stashEntry.index, stashEntry.hash)
        }
        return
      }

      if (event.shiftKey) {
        actions.selectCommitRange(commit.hash, commits)
        return
      }
      if (event.metaKey || event.ctrlKey) {
        actions.toggleCommitSelection(commit.hash)
        return
      }
      actions.selectTimelineNode('commit', commit.hash)
    },
    [actions, commitAtClientY, commits, isPointerOverCommitRows, stashes]
  )

  const onDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, onCommitDoubleClick: (commit: GitCommit) => void) => {
      if (didDragRef.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (!isPointerOverCommitRows(event.clientY)) return

      const commit = commitAtClientY(event.clientY)
      if (!commit) return
      onCommitDoubleClick(commit)
    },
    [commitAtClientY, isPointerOverCommitRows]
  )

  const onContextMenu = useCallback(
    (
      event: React.MouseEvent<HTMLDivElement>,
      onRowContextMenu: (commit: GitCommit) => (event: React.MouseEvent) => void
    ) => {
      if (!isPointerOverCommitRows(event.clientY)) return
      const commit = commitAtClientY(event.clientY)
      if (!commit) return
      onRowContextMenu(commit)(event)
    },
    [commitAtClientY, isPointerOverCommitRows]
  )

  return {
    isDragging,
    overlayRef,
    commitRowAreaTop: prefixHeight,
    commitRowAreaHeight: commits.length * rowHeight,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
    onDoubleClick,
    onContextMenu
  }
}
