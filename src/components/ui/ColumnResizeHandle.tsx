import { useCallback, useEffect, useRef, useState } from 'react'

export function ColumnResizeHandle({
  onDrag,
  onResizeStart,
  onResizeEnd
}: {
  onDrag: (delta: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}) {
  const [resizing, setResizing] = useState(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      lastX.current = event.clientX
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
      const delta = event.clientX - lastX.current
      lastX.current = event.clientX
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
      aria-orientation="vertical"
      aria-label="Resize column"
      onMouseDown={onMouseDown}
      className={`w-1 shrink-0 cursor-col-resize bg-gf-surface/60 hover:bg-gf-surface-hover ${resizing ? 'bg-gf-fg-subtle' : ''}`}
    />
  )
}
