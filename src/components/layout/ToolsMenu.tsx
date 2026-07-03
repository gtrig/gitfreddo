import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { PickaxeSearchModal } from '@/components/actions/PickaxeSearchModal'
import { BisectPanelModal } from '@/components/actions/BisectPanelModal'
import { ReflogModal } from '@/components/actions/ReflogModal'
import { useWorkspaceStore } from '@/stores/workspace'

type ToolsPanel = 'pickaxe' | 'bisect' | 'reflog' | null

export function ToolsMenu() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<ToolsPanel>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openPanel(next: ToolsPanel) {
    setOpen(false)
    setPanel(next)
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          disabled={!connected}
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded border border-gf-border-strong text-xs ${
            open
              ? 'bg-gf-surface text-gf-fg'
              : 'text-gf-fg-muted hover:bg-gf-bg disabled:opacity-40'
          }`}
          title={t('tools.gitTools')}
          aria-label={t('tools.gitTools')}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <WrenchScrewdriverIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded border border-gf-border-strong bg-gf-bg py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover"
              onClick={() => openPanel('pickaxe')}
            >
              {t('tools.pickaxeSearch')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover"
              onClick={() => openPanel('bisect')}
            >
              {t('tools.bisect')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover"
              onClick={() => openPanel('reflog')}
            >
              {t('tools.reflog')}
            </button>
          </div>
        )}
      </div>

      <PickaxeSearchModal open={panel === 'pickaxe'} onClose={() => setPanel(null)} />
      <BisectPanelModal open={panel === 'bisect'} onClose={() => setPanel(null)} />
      <ReflogModal open={panel === 'reflog'} onClose={() => setPanel(null)} />
    </>
  )
}
