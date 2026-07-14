import {
  CreateChangeRequestModal,
  MergeChangeRequestButton
} from '@/components/Forge/CreateChangeRequestModal'
import type { GitlabMergeMethod } from '@shared/gitlab'

interface CreatePrModalProps {
  open: boolean
  onClose: () => void
  defaultHead: string
  defaultBase: string
  onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
}

export function CreatePrModal(props: CreatePrModalProps) {
  return <CreateChangeRequestModal {...props} i18nPrefix="gitlab" />
}

export function MergePrButton({
  onMerge
}: {
  onMerge: (method: GitlabMergeMethod) => Promise<void>
}) {
  return <MergeChangeRequestButton i18nPrefix="gitlab" onMerge={onMerge} />
}
