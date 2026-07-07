import { ArrowDownTrayIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import type { UpdateUiState } from '@shared/update'

interface UpdateBannerProps {
  state: UpdateUiState
  visible: boolean
  onDownload: () => void
  onInstall: () => void
  onDismiss: () => void
}

export function UpdateBanner({
  state,
  visible,
  onDownload,
  onInstall,
  onDismiss
}: UpdateBannerProps) {
  const { t } = useTranslation()

  if (!visible || !state.availableVersion) {
    return null
  }

  const isDownloading = state.status === 'downloading'
  const isDownloaded = state.status === 'downloaded'

  return (
    <div
      className="pointer-events-none fixed top-14 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto overflow-hidden rounded-lg border border-gf-border border-l-4 border-l-gf-accent bg-gf-surface shadow-2xl">
        <div className="flex items-start gap-3 px-3 py-2.5">
          <ArrowDownTrayIcon className="mt-0.5 h-5 w-5 shrink-0 text-gf-accent-fg" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gf-fg">
              {isDownloaded
                ? t('update.readyToInstall', { version: state.availableVersion })
                : t('update.available', { version: state.availableVersion })}
            </p>
            {isDownloading && (
              <p className="mt-1 text-xs text-gf-fg-muted">
                {t('update.downloading', { percent: Math.round(state.progressPercent ?? 0) })}
              </p>
            )}
            {state.releaseNotes && !isDownloading && (
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-gf-fg-subtle">
                {state.releaseNotes}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-1 text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg"
            aria-label={t('common.dismiss')}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-gf-border/60 px-3 py-2">
          {!isDownloaded && (
            <button
              type="button"
              disabled={isDownloading}
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded border border-gf-border-strong px-2.5 py-1 text-xs text-gf-fg hover:bg-gf-surface-hover disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden />
              {isDownloading ? t('update.downloadingAction') : t('update.download')}
            </button>
          )}
          {isDownloaded && (
            <button
              type="button"
              onClick={onInstall}
              className="inline-flex items-center gap-1.5 rounded border border-gf-accent/50 bg-gf-accent/10 px-2.5 py-1 text-xs text-gf-accent-fg hover:bg-gf-accent/20"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
              {t('update.restartToInstall')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
