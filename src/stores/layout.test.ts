import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMMIT_PANEL_DEFAULT,
  COMMIT_PANEL_MAX,
  COMMIT_PANEL_MIN,
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
    useLayoutStore.setState({
      leftWidth: LEFT_DEFAULT,
      rightWidth: RIGHT_DEFAULT,
      commitPanelHeight: COMMIT_PANEL_DEFAULT
    })
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

  it('clamps commit panel height', () => {
    useLayoutStore.getState().setCommitPanelHeight(50)
    expect(useLayoutStore.getState().commitPanelHeight).toBe(COMMIT_PANEL_MIN)
    useLayoutStore.getState().setCommitPanelHeight(999)
    expect(useLayoutStore.getState().commitPanelHeight).toBe(COMMIT_PANEL_MAX)
  })

  it('adjusts commit panel height by delta', () => {
    useLayoutStore.getState().setCommitPanelHeight(COMMIT_PANEL_DEFAULT)
    useLayoutStore.getState().adjustCommitPanelHeight(40)
    expect(useLayoutStore.getState().commitPanelHeight).toBe(COMMIT_PANEL_DEFAULT + 40)
  })

  it('loads persisted layout values on module init', async () => {
    vi.resetModules()
    localStorage.setItem(
      'gitfreddo:sidebar-layout',
      JSON.stringify({ leftWidth: 350, rightWidth: 400, commitPanelHeight: 220 })
    )

    const { useLayoutStore: reloadedStore } = await import('@/stores/layout')
    expect(reloadedStore.getState().leftWidth).toBe(350)
    expect(reloadedStore.getState().rightWidth).toBe(400)
    expect(reloadedStore.getState().commitPanelHeight).toBe(220)
  })

  it('falls back to defaults when persisted layout is corrupt', async () => {
    vi.resetModules()
    localStorage.setItem('gitfreddo:sidebar-layout', '{bad json')

    const { useLayoutStore: reloadedStore, LEFT_DEFAULT, RIGHT_DEFAULT, COMMIT_PANEL_DEFAULT } =
      await import('@/stores/layout')
    expect(reloadedStore.getState().leftWidth).toBe(LEFT_DEFAULT)
    expect(reloadedStore.getState().rightWidth).toBe(RIGHT_DEFAULT)
    expect(reloadedStore.getState().commitPanelHeight).toBe(COMMIT_PANEL_DEFAULT)
  })
})
