import { RenameEntityModal } from '@/components/Ui/RenameEntityModal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface RenameBranchModalProps {
  open: boolean
  currentName: string
  onClose: () => void
}

export function RenameBranchModal({ open, currentName, onClose }: RenameBranchModalProps) {
  const { renameBranch } = useGitMutations()

  return (
    <RenameEntityModal
      open={open}
      currentName={currentName}
      titleKey="modals.renameBranch.title"
      renameKey="modals.renameBranch.rename"
      newNameKey="modals.renameBranch.newName"
      isPending={renameBranch.isPending}
      onClose={onClose}
      onRename={async (newName) => {
        await renameBranch.mutateAsync({ oldName: currentName, newName })
      }}
    />
  )
}
