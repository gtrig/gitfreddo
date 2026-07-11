import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ColumnResizeHandle } from '@/components/Ui/ColumnResizeHandle'
import { CENTER_MIN, useLayoutStore } from '@/stores/layout'

interface ResizableMainLayoutProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  rightVisible?: boolean
  overlay?: ReactNode
}

export function ResizableMainLayout({
  left,
  center,
  right,
  rightVisible = true,
  overlay
}: ResizableMainLayoutProps) {
  const leftWidth = useLayoutStore((s) => s.leftWidth)
  const rightWidth = useLayoutStore((s) => s.rightWidth)
  const adjustLeftWidth = useLayoutStore((s) => s.adjustLeftWidth)
  const adjustRightWidth = useLayoutStore((s) => s.adjustRightWidth)
  const [resizing, setResizing] = useState(false)

  const effectiveRightWidth = rightVisible ? rightWidth : 0

  const onLeftDrag = useCallback(
    (delta: number) => {
      const container = document.getElementById('resizable-main-layout')
      if (!container) {
        adjustLeftWidth(delta)
        return
      }
      const maxLeft = container.clientWidth - effectiveRightWidth - CENTER_MIN - 2
      const next = Math.min(maxLeft, leftWidth + delta)
      adjustLeftWidth(next - leftWidth)
    },
    [adjustLeftWidth, effectiveRightWidth, leftWidth]
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
      const maxLeft = maxSide - effectiveRightWidth
      const maxRight = maxSide - leftWidth
      const state = useLayoutStore.getState()
      if (state.leftWidth > maxLeft) {
        state.setLeftWidth(maxLeft)
      }
      if (rightVisible && state.rightWidth > maxRight) {
        state.setRightWidth(maxRight)
      }
    }

    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [effectiveRightWidth, leftWidth, rightVisible, rightWidth])

  return (
    <div
      id="resizable-main-layout"
      className={`relative flex min-h-0 flex-1 ${resizing ? 'select-none' : ''}`}
    >
      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-gf-border bg-gf-bg-deep"
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      <ColumnResizeHandle
        onDrag={onLeftDrag}
        onResizeStart={() => setResizing(true)}
        onResizeEnd={() => setResizing(false)}
      />

      <div
        className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${rightVisible ? 'border-r border-gf-border' : ''}`}
      >
        {center}
      </div>

      {rightVisible && (
        <>
          <ColumnResizeHandle
            onDrag={onRightDrag}
            onResizeStart={() => setResizing(true)}
            onResizeEnd={() => setResizing(false)}
          />

          <div
            className="flex min-h-0 shrink-0 flex-col overflow-hidden"
            style={{ width: rightWidth }}
          >
            {right}
          </div>
        </>
      )}

      {overlay}
    </div>
  )
}
