import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, Checkbox, FieldLabel, Modal, TextArea } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { shouldVirtualize, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import { parseHashInput } from '@/lib/git/parseHashInput'
import type { RemoveStaleBranchesResult, StaleBranchSummary } from '@/lib/types'

interface RemoveStaleBranchesModalProps {
  open: boolean
  onClose: () => void
  seedHash?: string
  seedHashes?: string[]
}

export function RemoveStaleBranchesModal({
  open,
  onClose,
  seedHash,
  seedHashes
}: RemoveStaleBranchesModalProps) {
  const { t } = useTranslation()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const invalidate = useInvalidateGit()
  const showToast = useToastStore((s) => s.show)

  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [summary, setSummary] = useState<StaleBranchSummary | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hashInput, setHashInput] = useState('')

  const initialHashes = useMemo(
    () => [...(seedHashes ?? []), ...(seedHash ? [seedHash] : [])],
    [seedHash, seedHashes]
  )

  function kindHint(kind: StaleBranchSummary['refs'][number]['kind']): string {
    switch (kind) {
      case 'backup':
        return t('detail.kindBackup')
      case 'remote':
        return t('detail.kindRemote')
      case 'tag':
        return t('detail.kindTag')
      case 'branch':
        return t('detail.kindBranch')
      default:
        return t('detail.kindDefault')
    }
  }

  async function loadSummary(hashes: string[]) {
    if (!repoPath) return

    setLoading(true)
    try {
      const result = (await window.gitfreddo.invoke(
        'maintenance.staleBranches',
        hashes.length > 0 ? { hashes } : undefined,
        repoPath
      )) as StaleBranchSummary
      setSummary(result)
      setSelected(new Set(result.matchingRefs))
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setSummary(null)
      setSelected(new Set())
      return
    }

    const hashes = [...new Set(initialHashes)]
    setHashInput(hashes.join('\n'))
    void loadSummary(hashes)
  }, [open, initialHashes, repoPath])

  function toggleRef(ref: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(ref)) next.delete(ref)
      else next.add(ref)
      return next
    })
  }

  async function handleRemove() {
    if (!repoPath || selected.size === 0) return

    setRemoving(true)
    try {
      const result = (await window.gitfreddo.invoke(
        'maintenance.removeStaleBranches',
        { refs: [...selected] },
        repoPath
      )) as RemoveStaleBranchesResult
      showToast(
        t('detail.removedReferences', {
          refs: result.deletedRefs.length,
          commits: result.removedCommitCount
        }),
        'success'
      )
      invalidate('branch.list', 'log.graph', 'status', 'working.status')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setRemoving(false)
    }
  }

  const selectedCommitCount = summary
    ? summary.refs
        .filter((entry) => selected.has(entry.ref))
        .reduce((total, entry) => total + entry.commitsNotOnHead, 0)
    : 0

  const refs = summary?.refs ?? []
  const refsScrollRef = useRef<HTMLUListElement>(null)
  const useVirtualization = shouldVirtualize(refs.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? refs.length : 0,
    getScrollElement: () => refsScrollRef.current,
    estimateSize: () => 64,
    overscan: VIRTUAL_OVERSCAN
  })

  const deleteButtonLabel =
    selectedCommitCount > 0
      ? `${t('detail.deleteReferences', { count: selected.size })}${t('detail.deleteReferencesWithCommits', { count: selectedCommitCount })}`
      : t('detail.deleteReferences', { count: selected.size })

  return (
    <Modal open={open} title={t('detail.removeStaleTitle')} onClose={onClose} size="lg">
      <p className="mb-4 text-sm text-gf-fg-muted">{t('detail.removeStaleDescription')}</p>

      <div className="mb-4">
        <FieldLabel>{t('detail.commitHashesToMatch')}</FieldLabel>
        <TextArea
          value={hashInput}
          onChange={(event) => setHashInput(event.target.value)}
          rows={4}
          placeholder={t('detail.pasteCommitHashes')}
          className="font-mono text-xs"
        />
        <div className="mt-2 flex justify-end">
          <ActionButton
            disabled={loading}
            onClick={() => void loadSummary([...new Set(parseHashInput(hashInput))])}
          >
            {t('detail.matchReferences')}
          </ActionButton>
        </div>
      </div>

      {loading ? (
        <LoadingRow label={t('detail.scanningStaleReferences')} />
      ) : summary ? (
        <div className="space-y-3">
          <p className="text-xs text-gf-fg-muted">
            {t('detail.commitsNotOnBranch', { count: summary.totalCommitsNotOnHead })}
          </p>

          {summary.refs.length === 0 ? (
            <p className="rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-xs text-gf-fg-muted">
              {t('detail.noStaleReferences')}
            </p>
          ) : (
            <ul
              ref={refsScrollRef}
              className="max-h-56 overflow-y-auto rounded border border-gf-border-strong bg-gf-bg-deep p-2"
              style={useVirtualization ? { position: 'relative' } : undefined}
            >
              {useVirtualization ? (
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const entry = refs[virtualItem.index]!
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        <label className="flex cursor-pointer gap-3 rounded px-2 py-1.5 hover:bg-gf-surface-hover">
                          <Checkbox
                            checked={selected.has(entry.ref)}
                            onChange={() => toggleRef(entry.ref)}
                            disabled={removing}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 text-xs">
                            <span className="font-medium text-gf-fg">{entry.label}</span>
                            <span className="mt-0.5 block truncate text-gf-fg-muted">
                              {entry.shortHash} · {entry.subject}
                            </span>
                            <span className="text-gf-fg-subtle">
                              {kindHint(entry.kind)} ·{' '}
                              {t('detail.commitsNotOnCurrentBranch', { count: entry.commitsNotOnHead })}
                            </span>
                          </span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              ) : (
                summary.refs.map((entry) => (
                  <li key={entry.ref} className="space-y-2">
                    <label className="flex cursor-pointer gap-3 rounded px-2 py-1.5 hover:bg-gf-surface-hover">
                      <Checkbox
                        checked={selected.has(entry.ref)}
                        onChange={() => toggleRef(entry.ref)}
                        disabled={removing}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1 text-xs">
                        <span className="font-medium text-gf-fg">{entry.label}</span>
                        <span className="mt-0.5 block truncate text-gf-fg-muted">
                          {entry.shortHash} · {entry.subject}
                        </span>
                        <span className="text-gf-fg-subtle">
                          {kindHint(entry.kind)} ·{' '}
                          {t('detail.commitsNotOnCurrentBranch', { count: entry.commitsNotOnHead })}
                        </span>
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <ActionButton onClick={onClose} disabled={removing}>
          {t('common.cancel')}
        </ActionButton>
        <ActionButton
          variant="danger"
          loading={removing}
          disabled={selected.size === 0}
          onClick={() => void handleRemove()}
        >
          {deleteButtonLabel}
        </ActionButton>
      </div>
    </Modal>
  )
}
