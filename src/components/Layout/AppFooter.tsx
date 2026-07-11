import { useTranslation } from 'react-i18next'
import { ZoomControls } from '@/components/Layout/ZoomControls'

interface AppFooterProps {
  version: string
}

export function AppFooter({ version }: AppFooterProps) {
  const { t } = useTranslation()
  const label = version ? t('app.version', { version }) : '…'

  return (
    <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gf-border bg-gf-bg-deep px-3 py-0.5">
      <span className="select-none text-[11px] text-gf-fg-subtle" title={label}>
        {label}
      </span>
      <ZoomControls />
    </footer>
  )
}
