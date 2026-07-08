import { useTranslation } from 'react-i18next'
import { BitbucketIntegrationCard } from '@/components/Settings/panels/BitbucketIntegrationCard'
import { GithubIntegrationCard } from '@/components/Settings/panels/GithubIntegrationCard'

export function IntegrationsSettingsPanel() {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        {t('settings.integrations.intro')}
      </p>
      <GithubIntegrationCard />
      <BitbucketIntegrationCard />
    </div>
  )
}
