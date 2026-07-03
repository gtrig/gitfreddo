import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LEFT_DEFAULT,
  LEFT_MAX,
  LEFT_MIN,
  RIGHT_DEFAULT,
  RIGHT_MIN,
  useLayoutStore
} from '@/stores/layout'

function stubLocalStorage() {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    }
  })
  return storage
}

describe('useLayoutStore', () => {
  beforeEach(() => {
    stubLocalStorage()
    useLayoutStore.setState({ leftWidth: LEFT_DEFAULT, rightWidth: RIGHT_DEFAULT })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clamps left and right widths', () => {
    useLayoutStore.getState().setLeftWidth(999)
    useLayoutStore.getState().setRightWidth(10)
    expect(useLayoutStore.getState().leftWidth).toBe(LEFT_MAX)
    expect(useLayoutStore.getState().rightWidth).toBe(RIGHT_MIN)
  })

  it('adjusts widths by delta', () => {
    useLayoutStore.getState().setLeftWidth(LEFT_MIN)
    useLayoutStore.getState().adjustLeftWidth(20)
    expect(useLayoutStore.getState().leftWidth).toBe(LEFT_MIN + 20)

    useLayoutStore.getState().setRightWidth(RIGHT_DEFAULT)
    useLayoutStore.getState().adjustRightWidth(30)
    expect(useLayoutStore.getState().rightWidth).toBe(RIGHT_DEFAULT - 30)
  })

  it('persists layout to localStorage', () => {
    useLayoutStore.getState().setLeftWidth(300)
    expect(localStorage.getItem('gitfreddo:sidebar-layout')).toContain('"leftWidth":300')
  })
})
