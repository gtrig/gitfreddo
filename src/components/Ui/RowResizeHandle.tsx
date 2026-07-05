import { useCallback, useEffect, useRef, useState } from 'react'

export function RowResizeHandle({
  onDrag,
  onResizeStart,
  onResizeEnd
}: {
  onDrag: (delta: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}) {
  const [resizing, setResizing] = useState(false)
  const lastY = useRef(0)

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      lastY.current = event.clientY
      setResizing(true)
      onResizeStart?.()
    },
    [onResizeStart]
  )

  useEffect(() => {
    if (!resizing) {
      return
    }

    const onMove = (event: MouseEvent) => {
      const delta = lastY.current - event.clientY
      lastY.current = event.clientY
      onDrag(delta)
    }

    const onUp = () => {
      setResizing(false)
      onResizeEnd?.()
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
      aria-orientation="horizontal"
      aria-label="Resize panel"
      onMouseDown={onMouseDown}
      className={`h-1 shrink-0 cursor-row-resize bg-gf-surface/60 hover:bg-gf-surface-hover ${resizing ? 'bg-gf-fg-subtle' : ''}`}
    />
  )
}
