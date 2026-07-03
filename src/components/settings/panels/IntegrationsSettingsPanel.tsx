import { useTranslation } from 'react-i18next'
import { GithubIntegrationCard } from '@/components/settings/panels/GithubIntegrationCard'

export function IntegrationsSettingsPanel() {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        {t('settings.integrations.intro')}
      </p>
      <GithubIntegrationCard />
    </div>
  )
}
