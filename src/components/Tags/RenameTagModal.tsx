import { RenameEntityModal } from '@/components/Ui/RenameEntityModal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { localTagName } from '@/lib/format/tagNames'

interface RenameTagModalProps {
  open: boolean
  currentName: string
  onClose: () => void
}

export function RenameTagModal({ open, currentName, onClose }: RenameTagModalProps) {
  const { renameTag } = useGitMutations()

  return (
    <RenameEntityModal
      open={open}
      currentName={currentName}
      displayName={localTagName(currentName)}
      titleKey="modals.renameTag.title"
      renameKey="modals.renameTag.rename"
      newNameKey="modals.renameTag.newName"
      isPending={renameTag.isPending}
      onClose={onClose}
      onRename={async (newName) => {
        await renameTag.mutateAsync({ oldName: currentName, newName })
      }}
    />
  )
}
