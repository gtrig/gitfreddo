import { GithubIntegrationCard } from '@/components/settings/panels/GithubIntegrationCard'

export function IntegrationsSettingsPanel() {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        Connect external services to GitFreddo for authenticated git operations and future features.
      </p>
      <GithubIntegrationCard />
    </div>
  )
}
