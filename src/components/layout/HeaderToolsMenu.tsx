import { HeaderIconSettings } from '@/components/actions/HeaderIcons'
import { LogToggleButton } from '@/components/layout/LogDrawer'

interface HeaderToolsMenuProps {
  onOpenSettings: () => void
}

export function HeaderToolsMenu({ onOpenSettings }: HeaderToolsMenuProps) {
  return (
    <nav
      className="flex items-center justify-end gap-2"
      aria-label="Tools"
    >
      <LogToggleButton />
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg"
        title="Settings (Ctrl+,)"
        aria-label="Settings"
      >
        <HeaderIconSettings className="h-3.5 w-3.5 shrink-0" />
      </button>
    </nav>
  )
}
