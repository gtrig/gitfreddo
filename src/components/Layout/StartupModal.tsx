import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { getStartupNewsItems } from '@/lib/news/content'

interface StartupModalProps {
  open: boolean
  onClose: () => void
  onContinue: (options: { hideFor30Days: boolean }) => void
  onCheckForUpdates: () => void
}

export function StartupModal({ open, onClose, onContinue, onCheckForUpdates }: StartupModalProps) {
  const { t } = useTranslation()
  const newsItems = getStartupNewsItems()
  const [hideFor30Days, setHideFor30Days] = useState(false)

  useEffect(() => {
    if (open) {
      setHideFor30Days(false)
    }
  }, [open])

  return (
    <Modal title={t('startup.title')} open={open} onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gf-fg-muted">{t('startup.intro')}</p>

        <section className="rounded-lg border border-gf-border bg-gf-bg-deep p-3">
          <h3 className="text-sm font-semibold text-gf-fg">{t('startup.supportTitle')}</h3>
          <p className="mt-1 text-sm text-gf-fg-subtle">{t('startup.supportBody')}</p>
          <a
            href="https://www.buymeacoffee.com/george0u"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt={t('startup.donateCta')}
              width="217"
              height="60"
            />
          </a>
        </section>

        <section className="rounded-lg border border-gf-border bg-gf-bg-deep p-3">
          <h3 className="text-sm font-semibold text-gf-fg">{t('startup.newsTitle')}</h3>
          {newsItems.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gf-fg-subtle">
              {newsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gf-fg-subtle">{t('startup.newsEmpty')}</p>
          )}
        </section>

        <section className="rounded-lg border border-gf-border bg-gf-bg-deep p-3">
          <h3 className="text-sm font-semibold text-gf-fg">{t('startup.updatesTitle')}</h3>
          <p className="mt-1 text-sm text-gf-fg-subtle">{t('startup.updatesBody')}</p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
            <input
              type="checkbox"
              checked={hideFor30Days}
              onChange={(event) => setHideFor30Days(event.target.checked)}
            />
            {t('startup.hideFor30Days')}
          </label>
          <div className="flex justify-end gap-2">
            <ActionButton onClick={onCheckForUpdates}>{t('startup.checkForUpdates')}</ActionButton>
            <ActionButton variant="primary" onClick={() => onContinue({ hideFor30Days })}>
              {t('startup.continue')}
            </ActionButton>
          </div>
        </div>
      </div>
    </Modal>
  )
}
