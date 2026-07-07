import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'

interface StartupModalProps {
  open: boolean
  onClose: () => void
  onCheckForUpdates: () => void
}

export function StartupModal({ open, onClose, onCheckForUpdates }: StartupModalProps) {
  const { t } = useTranslation()

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
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gf-fg-subtle">
            <li>{t('startup.newsItems.performance')}</li>
            <li>{t('startup.newsItems.github')}</li>
            <li>{t('startup.newsItems.ai')}</li>
          </ul>
        </section>

        <section className="rounded-lg border border-gf-border bg-gf-bg-deep p-3">
          <h3 className="text-sm font-semibold text-gf-fg">{t('startup.updatesTitle')}</h3>
          <p className="mt-1 text-sm text-gf-fg-subtle">{t('startup.updatesBody')}</p>
        </section>

        <div className="flex justify-end gap-2">
          <ActionButton onClick={onCheckForUpdates}>{t('startup.checkForUpdates')}</ActionButton>
          <ActionButton variant="primary" onClick={onClose}>
            {t('startup.continue')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
