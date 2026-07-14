import { RenameEntityModal } from '@/components/Ui/RenameEntityModal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface RenameRemoteModalProps {
  open: boolean
  currentName: string
  onClose: () => void
}

export function RenameRemoteModal({ open, currentName, onClose }: RenameRemoteModalProps) {
  const { remoteRename } = useGitMutations()

  return (
    <RenameEntityModal
      open={open}
      currentName={currentName}
      titleKey="modals.renameRemote.title"
      renameKey="modals.renameRemote.rename"
      newNameKey="modals.renameRemote.newName"
      isPending={remoteRename.isPending}
      onClose={onClose}
      onRename={async (newName) => {
        await remoteRename.mutateAsync({ oldName: currentName, newName })
      }}
    />
  )
}
