import { useSelectionStore } from '@/stores/selection'
import { FileHistoryOverlay } from '@/components/History/FileHistoryOverlay'

export function FileHistoryScreen() {
  const fileHistoryPath = useSelectionStore((s) => s.fileHistoryPath)
  const closeFileHistory = useSelectionStore((s) => s.closeFileHistory)

  if (!fileHistoryPath) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gf-bg-deep">
      <FileHistoryOverlay path={fileHistoryPath} onClose={closeFileHistory} />
    </div>
  )
}
