import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface BranchVisibilityToggleProps {
  hidden: boolean
  disabled?: boolean
  onToggle: () => void
}

export function BranchVisibilityToggle({
  hidden,
  disabled = false,
  onToggle
}: BranchVisibilityToggleProps) {
  const { t } = useTranslation()
  const Icon = hidden ? EyeSlashIcon : EyeIcon

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      title={hidden ? t('sidebar.showInGraph') : t('sidebar.hideFromGraph')}
      aria-label={hidden ? t('sidebar.showInGraph') : t('sidebar.hideFromGraph')}
      className={`shrink-0 rounded p-0.5 transition-colors ${
        hidden
          ? 'text-gf-fg-subtle opacity-60 hover:text-gf-fg hover:opacity-100'
          : 'text-gf-fg-muted hover:text-gf-fg'
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
    </button>
  )
}
