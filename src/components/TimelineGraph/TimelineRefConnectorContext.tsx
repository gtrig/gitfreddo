import { createContext, useCallback, useContext, useRef } from 'react'

export type ConnectorAnchorRegister = (id: string, element: HTMLElement | null) => void

const TimelineRefConnectorContext = createContext<ConnectorAnchorRegister | null>(null)

export function useConnectorAnchor(id: string) {
  const register = useContext(TimelineRefConnectorContext)
  const idRef = useRef(id)
  idRef.current = id

  return useCallback(
    (element: HTMLElement | null) => {
      register?.(idRef.current, element)
    },
    [register]
  )
}

export function useConnectorAnchorRegistry(onChange: () => void) {
  const anchorsRef = useRef(new Map<string, HTMLElement>())
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const register = useCallback<ConnectorAnchorRegister>((id, element) => {
    const anchors = anchorsRef.current
    const previous = anchors.get(id)
    if (previous === element) return

    if (element) {
      anchors.set(id, element)
    } else {
      anchors.delete(id)
    }
    onChangeRef.current()
  }, [])

  return { register, anchorsRef }
}

export const TimelineRefConnectorRegisterContext = TimelineRefConnectorContext
