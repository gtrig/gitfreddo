import { useTranslation } from 'react-i18next'

interface IntegrationSshKeyStatusProps {
  sshKeyTitle: string | null
  namespace: 'github' | 'bitbucket'
}

export function IntegrationSshKeyStatus({ sshKeyTitle, namespace }: IntegrationSshKeyStatusProps) {
  const { t } = useTranslation()

  if (sshKeyTitle) {
    return (
      <div className="mt-2 rounded border border-gf-accent/25 bg-gf-accent/5 px-2.5 py-2">
        <p className="text-[11px] font-medium text-gf-accent">
          {t(`settings.${namespace}.sshKeyActive`)}
        </p>
        <p className="mt-0.5 truncate text-xs text-gf-fg" title={sshKeyTitle}>
          {t(`settings.${namespace}.sshKeyIdentifier`, { title: sshKeyTitle })}
        </p>
      </div>
    )
  }

  return (
    <p className="mt-2 text-xs text-gf-fg-muted">{t(`settings.${namespace}.sshKeyMissing`)}</p>
  )
}
