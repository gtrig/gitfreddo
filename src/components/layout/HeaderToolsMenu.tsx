import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { CommitSearch } from '@/components/layout/CommitSearch'
import { LogToggleButton } from '@/components/layout/LogDrawer'
import { ToolsMenu } from '@/components/layout/ToolsMenu'

interface HeaderToolsMenuProps {
  onOpenSettings: () => void
}

export function HeaderToolsMenu({ onOpenSettings }: HeaderToolsMenuProps) {
  const { t } = useTranslation()

  return (
    <nav
      className="flex items-center justify-end gap-2"
      aria-label={t('tools.toolsNav')}
    >
      <CommitSearch />
      <ToolsMenu />
      <LogToggleButton />
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg"
        title={t('tools.settingsShortcut')}
        aria-label={t('tools.settings')}
      >
        <Cog6ToothIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      </button>
    </nav>
  )
}
