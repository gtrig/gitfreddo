import { CreatePrModal as BitbucketCreatePrModal } from '@/components/Bitbucket/CreatePrModal'
import { CreatePrModal as GitHubCreatePrModal } from '@/components/GitHub/CreatePrModal'
import type { ForgeProvider } from '@/lib/forge/detect'

interface ForgeCreatePrModalProps {
  provider: ForgeProvider
  open: boolean
  onClose: () => void
  defaultHead: string
  defaultBase: string
  onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
}

export function ForgeCreatePrModal({ provider, ...props }: ForgeCreatePrModalProps) {
  if (provider === 'bitbucket') {
    return <BitbucketCreatePrModal {...props} />
  }
  return <GitHubCreatePrModal {...props} />
}
