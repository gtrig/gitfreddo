import { useSelectionStore } from '@/stores/selection'
import { ConflictMergeOverlay } from '@/components/DiffViewer/ConflictMergeOverlay'

export function MergeConflictScreen() {
  const selectedConflictFile = useSelectionStore((s) => s.selectedConflictFile)
  const closeDiffOverlay = useSelectionStore((s) => s.closeDiffOverlay)

  if (!selectedConflictFile) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gf-bg-deep">
      <ConflictMergeOverlay path={selectedConflictFile} onClose={closeDiffOverlay} />
    </div>
  )
}
