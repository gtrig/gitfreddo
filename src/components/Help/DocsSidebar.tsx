import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { getDocContent, getDocTitle } from '@/lib/docs/content'
import { DOC_SECTIONS } from '@/lib/docs/catalog'
import { filterDocSections } from '@/lib/docs/search'

interface DocsSidebarProps {
  activePath: string
  onSelect: (path: string) => void
}

function buildDocLookup(): {
  titlesByPath: Record<string, string>
  contentsByPath: Record<string, string>
} {
  const titlesByPath: Record<string, string> = {}
  const contentsByPath: Record<string, string> = {}

  for (const section of DOC_SECTIONS) {
    for (const page of section.pages) {
      titlesByPath[page.path] = getDocTitle(page.path)
      contentsByPath[page.path] = getDocContent(page.path) ?? ''
    }
  }

  return { titlesByPath, contentsByPath }
}

const docLookup = buildDocLookup()

export function DocsSidebar({ activePath, onSelect }: DocsSidebarProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const sections = useMemo(
    () =>
      filterDocSections(
        DOC_SECTIONS,
        query,
        docLookup.titlesByPath,
        docLookup.contentsByPath
      ),
    [query]
  )

  return (
    <nav
      className="flex w-52 shrink-0 flex-col border-r border-gf-border pr-2"
      aria-label={t('docs.navAria')}
    >
      <div className="relative shrink-0 pb-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('docs.searchPlaceholder')}
          aria-label={t('docs.searchPlaceholder')}
          className="w-full rounded border border-gf-border bg-gf-bg py-1.5 pl-2.5 pr-8 text-xs text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-border-strong focus:outline-none"
        />
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gf-fg-subtle"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {sections.length === 0 ? (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('docs.searchEmpty')}</p>
        ) : (
          sections.map((section) => (
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
                      {docLookup.titlesByPath[page.path] ?? getDocTitle(page.path)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </nav>
  )
}
