import { useTranslation } from 'react-i18next'
import { getDocTitle } from '@/lib/docs/content'
import { DOC_SECTIONS } from '@/lib/docs/catalog'

interface DocsSidebarProps {
  activePath: string
  onSelect: (path: string) => void
}

export function DocsSidebar({ activePath, onSelect }: DocsSidebarProps) {
  const { t } = useTranslation()

  return (
    <nav className="w-52 shrink-0 overflow-y-auto border-r border-gf-border pr-2" aria-label={t('docs.navAria')}>
      <div className="space-y-4">
        {DOC_SECTIONS.map((section) => (
          <section key={section.id}>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-gf-fg-subtle">
              {t(section.titleKey)}
            </h3>
            <ul className="space-y-0.5">
              {section.pages.map((page) => (
                <li key={page.path}>
                  <button
                    type="button"
                    onClick={() => onSelect(page.path)}
                    aria-current={activePath === page.path ? 'page' : undefined}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs transition ${
                      activePath === page.path
                        ? 'bg-gf-surface text-gf-fg'
                        : 'text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted'
                    }`}
                  >
                    {getDocTitle(page.path)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  )
}
