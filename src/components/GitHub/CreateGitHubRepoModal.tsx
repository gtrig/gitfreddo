import { useEffect, useState } from 'react'
import type { GitHubRepo } from '@shared/github'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'

export interface CreateGitHubRepoModalProps {
  open: boolean
  onClose: () => void
  onCreated: (repo: GitHubRepo) => void | Promise<void>
  /** When false, creates an empty repo suitable for pushing an existing local repo. */
  autoInit?: boolean
  submitLabel?: string
}

export function CreateGitHubRepoModal({
  open,
  onClose,
  onCreated,
  autoInit = false,
  submitLabel = 'Create repository'
}: CreateGitHubRepoModalProps) {
  const { data: status } = useGitHubStatus()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setIsPrivate(false)
    setError(null)
  }, [open])

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Repository name is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const repo = await window.gitfreddo.githubCreateRepo({
        name: name.trim(),
        description: description.trim() || undefined,
        private: isPrivate,
        autoInit
      })
      await onCreated(repo)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!status?.connected) {
    return (
      <Modal open={open} title="Create on GitHub" onClose={onClose}>
        <p className="p-4 text-sm text-gf-fg-subtle">
          Connect GitHub in Settings → Integrations to create repositories.
        </p>
      </Modal>
    )
  }

  return (
    <Modal open={open} title="Create on GitHub" onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Repository name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder="my-new-repo"
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Description (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder="Short description"
          />
        </label>
        <div className="flex gap-2">
          {(['public', 'private'] as const).map((visibility) => (
            <button
              key={visibility}
              type="button"
              onClick={() => setIsPrivate(visibility === 'private')}
              className={`rounded border px-3 py-1.5 text-xs capitalize ${
                (visibility === 'private') === isPrivate
                  ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                  : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
              }`}
            >
              {visibility}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton variant="primary" onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? 'Creating…' : submitLabel}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
