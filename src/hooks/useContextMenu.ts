import { useCallback, useState } from 'react'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

export type OpenContextMenu = (event: React.MouseEvent, items: ContextMenuItem[]) => void

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null)

  const openMenu = useCallback((event: React.MouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault()
    event.stopPropagation()
    if (items.filter((item) => !item.separator).length === 0) {
      return
    }
    setState({ x: event.clientX, y: event.clientY, items })
  }, [])

  const closeMenu = useCallback(() => setState(null), [])

  return { state, openMenu, closeMenu }
}
