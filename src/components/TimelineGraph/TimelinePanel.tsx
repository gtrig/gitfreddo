import { useTranslation } from 'react-i18next'
import { CommitTimeline } from './CommitTimeline'

export function TimelinePanel() {
  const { t } = useTranslation()

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-gf-border px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gf-fg-subtle">
          {t('timeline.graphTitle')}
        </h2>
        <p className="text-[11px] text-gf-fg-subtle">{t('timeline.graphSubtitle')}</p>
      </div>
      <CommitTimeline />
    </section>
  )
}
