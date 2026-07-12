import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setMainWindow } from './menu'
import {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  applyStoredZoom,
  clampZoomFactor,
  getZoomFactor,
  setZoomFactor,
  zoomIn,
  zoomOut
} from './zoom'

function mockWindow(zoomFactor = 1) {
  const setZoomFactorMock = vi.fn()
  const getZoomFactorMock = vi.fn(() => zoomFactor)
  const window = {
    isDestroyed: () => false,
    webContents: {
      getZoomFactor: getZoomFactorMock,
      setZoomFactor: setZoomFactorMock
    }
  }
  setMainWindow(window as unknown as import('electron').BrowserWindow)
  return { setZoomFactorMock, getZoomFactorMock }
}

describe('clampZoomFactor', () => {
  it('clamps to configured min and max with one decimal place', () => {
    expect(clampZoomFactor(0.1)).toBe(ZOOM_MIN)
    expect(clampZoomFactor(3)).toBe(ZOOM_MAX)
    expect(clampZoomFactor(1.234)).toBe(1.2)
    expect(clampZoomFactor(1.26)).toBe(1.3)
  })

  it('keeps values within the allowed range', () => {
    expect(clampZoomFactor(1)).toBe(1)
    expect(clampZoomFactor(0.5)).toBe(0.5)
    expect(clampZoomFactor(2)).toBe(2)
  })
})

describe('zoom controls', () => {
  beforeEach(() => {
    setMainWindow(null)
  })

  it('returns 1 when no main window is available', () => {
    expect(getZoomFactor()).toBe(1)
    expect(setZoomFactor(1.5)).toBe(1)
  })

  it('reads the current zoom factor from webContents', () => {
    mockWindow(1.3)
    expect(getZoomFactor()).toBe(1.3)
  })

  it('sets a clamped zoom factor on webContents', () => {
    const { setZoomFactorMock } = mockWindow()
    expect(setZoomFactor(1.55)).toBe(1.6)
    expect(setZoomFactorMock).toHaveBeenCalledWith(1.6)
  })

  it('increments and decrements zoom by the configured step', () => {
    const { setZoomFactorMock } = mockWindow(1)
    expect(zoomIn()).toBe(1 + ZOOM_STEP)
    expect(setZoomFactorMock).toHaveBeenLastCalledWith(1.1)

    mockWindow(1.1)
    expect(zoomOut()).toBe(1)
  })

  it('applies stored zoom without returning a value', () => {
    const { setZoomFactorMock } = mockWindow()
    applyStoredZoom(2.5)
    expect(setZoomFactorMock).toHaveBeenCalledWith(ZOOM_MAX)
  })

  it('ignores applyStoredZoom when the window is missing', () => {
    setMainWindow(null)
    expect(() => applyStoredZoom(1.5)).not.toThrow()
  })
})
