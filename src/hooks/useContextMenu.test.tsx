/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import { useContextMenu } from './useContextMenu'

function mouseEvent(x: number, y: number): React.MouseEvent {
  return {
    clientX: x,
    clientY: y,
    preventDefault: () => undefined,
    stopPropagation: () => undefined
  } as React.MouseEvent
}

describe('useContextMenu', () => {
  const items: ContextMenuItem[] = [
    { id: 'copy', label: 'Copy', onClick: () => undefined },
    { id: 'sep', label: '', separator: true, onClick: () => undefined },
    { id: 'delete', label: 'Delete', onClick: () => undefined }
  ]

  it('opens a menu at the pointer position', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.openMenu(mouseEvent(120, 80), items)
    })

    expect(result.current.state).toEqual({
      x: 120,
      y: 80,
      items
    })
  })

  it('ignores menus that only contain separators', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.openMenu(mouseEvent(10, 10), [
        { id: 'sep', label: '', separator: true, onClick: () => undefined }
      ])
    })

    expect(result.current.state).toBeNull()
  })

  it('closes the open menu', () => {
    const { result } = renderHook(() => useContextMenu())

    act(() => {
      result.current.openMenu(mouseEvent(5, 5), items)
      result.current.closeMenu()
    })

    expect(result.current.state).toBeNull()
  })
})
