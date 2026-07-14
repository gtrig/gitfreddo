import { CreateChangeRequestModal } from '@/components/Forge/CreateChangeRequestModal'
import type { ForgeProvider } from '@/lib/forge/detect'

interface ForgeCreatePrModalProps {
  provider: ForgeProvider
  open: boolean
  onClose: () => void
  defaultHead: string
  defaultBase: string
  onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
}

const I18N_PREFIX: Record<ForgeProvider, string> = {
  github: 'github',
  gitlab: 'gitlab',
  bitbucket: 'bitbucket'
}

export function ForgeCreatePrModal({ provider, ...props }: ForgeCreatePrModalProps) {
  return <CreateChangeRequestModal {...props} i18nPrefix={I18N_PREFIX[provider]} />
}
