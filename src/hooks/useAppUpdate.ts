import { useCallback, useEffect, useState } from 'react'
import type { UpdateEvent, UpdateUiState } from '@shared/update'
import { reduceUpdateState } from '@shared/update'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'
import { useTranslation } from 'react-i18next'

export function useAppUpdate() {
  const { t } = useTranslation()
  const showToast = useToastStore((s) => s.show)
  const operationCount = useOperationStore((s) => s.count)
  const [state, setState] = useState<UpdateUiState>({
    status: 'idle',
    currentVersion: ''
  })
  const [dismissed, setDismissed] = useState(false)
  const [manualCheckPending, setManualCheckPending] = useState(false)

  useEffect(() => {
    void window.gitfreddo.getAppVersion().then((version) => {
      setState((current) => ({ ...current, currentVersion: version }))
    })
  }, [])

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onUpdateEvent((event: UpdateEvent) => {
      setState((current) => reduceUpdateState(current, event))
      if (event.type === 'available') {
        setDismissed(false)
      }
      if (event.type === 'not-available' && manualCheckPending) {
        showToast(t('update.upToDate', { version: event.version }), 'success')
        setManualCheckPending(false)
      }
      if (event.type === 'error' && manualCheckPending) {
        showToast(event.message || t('update.error'), 'error')
        setManualCheckPending(false)
      }
    })
    return unsubscribe
  }, [manualCheckPending, showToast, t])

  const checkForUpdates = useCallback(async (manual = false) => {
    if (manual) {
      setManualCheckPending(true)
    }
    await window.gitfreddo.checkForUpdates()
  }, [])

  const downloadUpdate = useCallback(async () => {
    try {
      await window.gitfreddo.downloadUpdate()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }, [showToast])

  const installUpdate = useCallback(() => {
    if (operationCount > 0) {
      showToast(t('update.waitForGitOperations'), 'error')
      return
    }
    window.gitfreddo.installUpdate()
  }, [operationCount, showToast, t])

  const dismissBanner = useCallback(() => setDismissed(true), [])

  const bannerVisible =
    !dismissed && (state.status === 'available' || state.status === 'downloading' || state.status === 'downloaded')

  return {
    state,
    bannerVisible,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissBanner
  }
}
