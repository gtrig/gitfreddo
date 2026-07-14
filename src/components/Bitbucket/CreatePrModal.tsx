import {
  CreateChangeRequestModal,
  MergeChangeRequestButton
} from '@/components/Forge/CreateChangeRequestModal'
import type { BitbucketMergeMethod } from '@shared/bitbucket'

interface CreatePrModalProps {
  open: boolean
  onClose: () => void
  defaultHead: string
  defaultBase: string
  onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
}

export function CreatePrModal(props: CreatePrModalProps) {
  return <CreateChangeRequestModal {...props} i18nPrefix="bitbucket" />
}

export function MergePrButton({
  onMerge
}: {
  onMerge: (method: BitbucketMergeMethod) => Promise<void>
}) {
  return <MergeChangeRequestButton i18nPrefix="bitbucket" onMerge={onMerge} />
}
