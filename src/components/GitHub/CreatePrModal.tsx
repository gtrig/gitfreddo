import {
  CreateChangeRequestModal,
  MergeChangeRequestButton
} from '@/components/Forge/CreateChangeRequestModal'
import type { GitHubMergeMethod } from '@shared/github'

interface CreatePrModalProps {
  open: boolean
  onClose: () => void
  defaultHead: string
  defaultBase: string
  onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
}

export function CreatePrModal(props: CreatePrModalProps) {
  return <CreateChangeRequestModal {...props} i18nPrefix="github" />
}

export function MergePrButton({
  onMerge
}: {
  onMerge: (method: GitHubMergeMethod) => Promise<void>
}) {
  return <MergeChangeRequestButton i18nPrefix="github" onMerge={onMerge} />
}
