import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { GitUndoResult } from '@/lib/types'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

export function useUndoLast() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const { undoLast } = useGitMutations()
  const showToast = useToastStore((s) => s.show)

  const performUndo = useCallback(async () => {
    if (!connected) {
      showToast(t('toast.noRepoConnected'), 'error')
      return
    }

    try {
      const result = (await undoLast.mutateAsync(undefined)) as GitUndoResult
      showToast(t('toast.undo.success', { subject: result.subject }), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.undo.error'), 'error')
    }
  }, [connected, showToast, t, undoLast])

  const handleUndoKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod || event.key.toLowerCase() !== 'z' || event.shiftKey) return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      void performUndo()
    },
    [performUndo]
  )

  return {
    performUndo,
    handleUndoKeyDown,
    isUndoing: undoLast.isPending
  }
}
