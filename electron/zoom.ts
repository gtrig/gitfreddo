import type { WebContents } from 'electron'
import { getMainWindow } from './menu'

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2
export const ZOOM_STEP = 0.1

export function clampZoomFactor(factor: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(factor * 10) / 10))
}

function getWebContents(): WebContents | null {
  const window = getMainWindow()
  if (!window || window.isDestroyed()) {
    return null
  }
  return window.webContents
}

export function getZoomFactor(): number {
  return getWebContents()?.getZoomFactor() ?? 1
}

export function setZoomFactor(factor: number): number {
  const webContents = getWebContents()
  if (!webContents) {
    return 1
  }
  const clamped = clampZoomFactor(factor)
  webContents.setZoomFactor(clamped)
  return clamped
}

export function zoomIn(): number {
  return setZoomFactor(getZoomFactor() + ZOOM_STEP)
}

export function zoomOut(): number {
  return setZoomFactor(getZoomFactor() - ZOOM_STEP)
}

export function applyStoredZoom(factor: number): void {
  const webContents = getWebContents()
  if (!webContents) {
    return
  }
  webContents.setZoomFactor(clampZoomFactor(factor))
}
