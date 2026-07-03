import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2

function formatZoomPercent(factor: number): string {
  return `${Math.round(factor * 100)}%`
}

export function ZoomControls() {
  const { t } = useTranslation()
  const [zoomFactor, setZoomFactor] = useState(1)

  useEffect(() => {
    void window.gitfreddo.getZoomFactor().then(setZoomFactor)
    return window.gitfreddo.onZoomChanged(setZoomFactor)
  }, [])

  const zoomOut = useCallback(() => {
    void window.gitfreddo.zoomOut().then(setZoomFactor)
  }, [])

  const zoomIn = useCallback(() => {
    void window.gitfreddo.zoomIn().then(setZoomFactor)
  }, [])

  const atMin = zoomFactor <= ZOOM_MIN
  const atMax = zoomFactor >= ZOOM_MAX

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={zoomOut}
        disabled={atMin}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg disabled:cursor-not-allowed disabled:opacity-40"
        title={t('tools.zoomOut')}
        aria-label={t('tools.zoomOut')}
      >
        <MagnifyingGlassMinusIcon aria-hidden className="h-3.5 w-3.5" />
      </button>
      <span
        className="min-w-[3rem] text-center text-xs tabular-nums text-gf-fg-muted"
        aria-live="polite"
        aria-label={t('tools.zoomLevel', { percent: Math.round(zoomFactor * 100) })}
      >
        {formatZoomPercent(zoomFactor)}
      </span>
      <button
        type="button"
        onClick={zoomIn}
        disabled={atMax}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg disabled:cursor-not-allowed disabled:opacity-40"
        title={t('tools.zoomIn')}
        aria-label={t('tools.zoomIn')}
      >
        <MagnifyingGlassPlusIcon aria-hidden className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
