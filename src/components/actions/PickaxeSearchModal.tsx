import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, ActionButton, FieldLabel, TextInput, Select } from '@/components/ui/Modal'
import { LoadingRow } from '@/components/ui/Spinner'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import type { GitCommit } from '@/lib/types'

interface PickaxeSearchModalProps {
  open: boolean
  onClose: () => void
}

export function PickaxeSearchModal({ open, onClose }: PickaxeSearchModalProps) {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'pickaxe' | 'regex'>('pickaxe')
  const [submitted, setSubmitted] = useState<{ query: string; mode: 'pickaxe' | 'regex' } | null>(
    null
  )

  const results = useQuery({
    queryKey: ['repo', repoPath, 'log.pickaxe', submitted?.query, submitted?.mode],
    queryFn: async () =>
      (await window.gitfreddo.invoke('log.pickaxe', {
        query: submitted!.query,
        mode: submitted!.mode,
        maxCount: 100
      })) as GitCommit[],
    enabled: connected && Boolean(repoPath) && Boolean(submitted?.query.trim())
  })

  function handleClose() {
    setQuery('')
    setMode('pickaxe')
    setSubmitted(null)
    onClose()
  }

  return (
    <Modal open={open} title="Pickaxe search" onClose={handleClose} size="lg">
      <div className="space-y-3">
        <div>
          <FieldLabel>Search string</FieldLabel>
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Code or text to find in history"
          />
        </div>
        <div>
          <FieldLabel>Mode</FieldLabel>
          <Select value={mode} onChange={(event) => setMode(event.target.value as 'pickaxe' | 'regex')}>
            <option value="pickaxe">Pickaxe (-S) — added/removed string</option>
            <option value="regex">Regex (-G) — pattern match</option>
          </Select>
        </div>
        <div className="flex justify-end">
          <ActionButton
            variant="primary"
            disabled={!query.trim()}
            onClick={() => setSubmitted({ query: query.trim(), mode })}
          >
            Search
          </ActionButton>
        </div>

        {results.isLoading && <LoadingRow label="Searching history…" />}
        {results.error && (
          <p className="text-sm text-red-400">
            {results.error instanceof Error ? results.error.message : 'Search failed.'}
          </p>
        )}
        {results.data && (
          <div className="max-h-72 overflow-y-auto rounded border border-gf-border">
            {results.data.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gf-fg-subtle">No matching commits.</p>
            ) : (
              results.data.map((commit) => (
                <button
                  key={commit.hash}
                  type="button"
                  onClick={() => {
                    selectTimelineNode('commit', commit.hash)
                    handleClose()
                  }}
                  className="flex w-full flex-col gap-0.5 border-b border-gf-border/60 px-3 py-2 text-left hover:bg-gf-surface-hover last:border-b-0"
                >
                  <span className="font-mono text-xs text-gf-fg-muted">{commit.shortHash}</span>
                  <span className="text-sm text-gf-fg">{commit.subject}</span>
                  <span className="text-xs text-gf-fg-subtle">
                    {commit.author.name} · {new Date(commit.author.date).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
