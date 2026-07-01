import { useEffect, useMemo, useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { ConflictDiffView } from '@/components/DiffViewer/ConflictDiffView'
import { applyConflictResolutions, parseConflictMarkers } from '@/lib/conflictMarkers'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

interface ConflictResolverModalProps {
  open: boolean
  path: string
  onClose: () => void
}

export function ConflictResolverModal({ open, path, onClose }: ConflictResolverModalProps) {
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { stageAdd } = useGitMutations()
  const show = useToastStore((s) => s.show)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resolutions, setResolutions] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    if (!open || !repoPath) return
    setLoading(true)
    void window.gitfredo
      .invoke('working.read', { path }, repoPath)
      .then((text) => {
        const fileContent = String(text)
        setContent(fileContent)
        const hunks = parseConflictMarkers(fileContent)
        setResolutions(new Map(hunks.map((hunk) => [hunk.id, hunk.resolved])))
      })
      .catch((error) => {
        show(error instanceof Error ? error.message : String(error), 'error')
      })
      .finally(() => setLoading(false))
  }, [open, path, repoPath, show])

  const hunks = useMemo(() => parseConflictMarkers(content), [content])

  function updateResolution(hunkId: number, resolved: string) {
    setResolutions((current) => new Map(current).set(hunkId, resolved))
  }

  async function handleSave() {
    if (!repoPath) return
    setSaving(true)
    try {
      const resolved = applyConflictResolutions(content, resolutions)
      await window.gitfredo.invoke('working.write', { path, content: resolved }, repoPath)
      await stageAdd.mutateAsync({ paths: [path] })
      show('Conflict resolved and staged.', 'success')
      onClose()
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={`Resolve conflict — ${path}`} onClose={onClose} size="lg">
      <div className="max-h-[70vh] space-y-3 overflow-auto p-4">
        {loading ? (
          <p className="text-sm text-gf-fg-subtle">Loading file…</p>
        ) : hunks.length === 0 ? (
          <p className="text-sm text-gf-fg-subtle">No conflict markers found in this file.</p>
        ) : (
          <ConflictDiffView hunks={hunks} onChange={updateResolution} />
        )}
        <div className="flex justify-end gap-2 border-t border-gf-border pt-3">
          <ActionButton onClick={() => void window.gitfredo.openInEditor(path)}>
            Open in editor
          </ActionButton>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton loading={saving} onClick={() => void handleSave()}>
            Save & stage
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
