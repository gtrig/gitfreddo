import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CENTER_MIN, useLayoutStore } from '@/stores/layout'

function ColumnResizeHandle({
  onDrag,
  onResizeStart,
  onResizeEnd
}: {
  onDrag: (delta: number) => void
  onResizeStart: () => void
  onResizeEnd: () => void
}) {
  const [resizing, setResizing] = useState(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      lastX.current = event.clientX
      setResizing(true)
      onResizeStart()
    },
    [onResizeStart]
  )

  useEffect(() => {
    if (!resizing) {
      return
    }

    const onMove = (event: MouseEvent) => {
      const delta = event.clientX - lastX.current
      lastX.current = event.clientX
      onDrag(delta)
    }

    const onUp = () => {
      setResizing(false)
      onResizeEnd()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onDrag, onResizeEnd, resizing])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      className={`w-1 shrink-0 cursor-col-resize bg-gf-surface/60 hover:bg-gf-surface-hover ${resizing ? 'bg-gf-fg-subtle' : ''}`}
    />
  )
}

interface ResizableMainLayoutProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  overlay?: ReactNode
}

export function ResizableMainLayout({ left, center, right, overlay }: ResizableMainLayoutProps) {
  const leftWidth = useLayoutStore((s) => s.leftWidth)
  const rightWidth = useLayoutStore((s) => s.rightWidth)
  const adjustLeftWidth = useLayoutStore((s) => s.adjustLeftWidth)
  const adjustRightWidth = useLayoutStore((s) => s.adjustRightWidth)
  const [resizing, setResizing] = useState(false)

  const onLeftDrag = useCallback(
    (delta: number) => {
      const container = document.getElementById('resizable-main-layout')
      if (!container) {
        adjustLeftWidth(delta)
        return
      }
      const maxLeft = container.clientWidth - rightWidth - CENTER_MIN - 2
      const next = Math.min(maxLeft, leftWidth + delta)
      adjustLeftWidth(next - leftWidth)
    },
    [adjustLeftWidth, leftWidth, rightWidth]
  )

  const onRightDrag = useCallback(
    (delta: number) => {
      const container = document.getElementById('resizable-main-layout')
      if (!container) {
        adjustRightWidth(delta)
        return
      }
      const maxRight = container.clientWidth - leftWidth - CENTER_MIN - 2
      const next = Math.min(maxRight, rightWidth - delta)
      adjustRightWidth(-(next - rightWidth))
    },
    [adjustRightWidth, leftWidth, rightWidth]
  )

  useEffect(() => {
    const onResize = () => {
      const container = document.getElementById('resizable-main-layout')
      if (!container) {
        return
      }
      const maxSide = container.clientWidth - CENTER_MIN - 2
      const maxLeft = maxSide - rightWidth
      const maxRight = maxSide - leftWidth
      const state = useLayoutStore.getState()
      if (state.leftWidth > maxLeft) {
        state.setLeftWidth(maxLeft)
      }
      if (state.rightWidth > maxRight) {
        state.setRightWidth(maxRight)
      }
    }

    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [leftWidth, rightWidth])

  return (
    <div
      id="resizable-main-layout"
      className={`relative flex min-h-0 flex-1 ${resizing ? 'select-none' : ''}`}
    >
      <div
        className="flex min-h-0 shrink-0 flex-col overflow-auto border-r border-gf-border bg-gf-bg-deep"
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      <ColumnResizeHandle
        onDrag={onLeftDrag}
        onResizeStart={() => setResizing(true)}
        onResizeEnd={() => setResizing(false)}
      />

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden border-r border-gf-border">
        {center}
      </div>

      <ColumnResizeHandle
        onDrag={onRightDrag}
        onResizeStart={() => setResizing(true)}
        onResizeEnd={() => setResizing(false)}
      />

      <div className="min-h-0 shrink-0 overflow-auto" style={{ width: rightWidth }}>
        {right}
      </div>

      {overlay}
    </div>
  )
}
