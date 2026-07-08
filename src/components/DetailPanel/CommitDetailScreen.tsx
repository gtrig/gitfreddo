import { useLogGraph } from '@/hooks/useGit'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { CommitDetailOverlay } from '@/components/DetailPanel/CommitDetailOverlay'

export function CommitDetailScreen() {
  const connected = useWorkspaceStore((s) => s.connected)
  const commitDetailHash = useSelectionStore((s) => s.commitDetailHash)
  const closeCommitDetail = useSelectionStore((s) => s.closeCommitDetail)
  const { data: graph } = useLogGraph(connected)

  const commit = graph?.commits.find((item) => item.hash === commitDetailHash)

  if (!commitDetailHash || !commit) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gf-bg-deep">
      <CommitDetailOverlay commit={commit} onClose={closeCommitDetail} />
    </div>
  )
}
