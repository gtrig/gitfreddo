import { useTranslation } from 'react-i18next'
import { ActionButton, FieldLabel, TextInput } from '@/components/Ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onPickGit: () => void
}

export function GitSettingsPanel({ form, onChange, onPickGit }: PanelProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <FieldLabel>{t('settings.git.binaryPath')}</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={form.gitBinaryPath}
              onChange={(e) => onChange({ gitBinaryPath: e.target.value })}
            />
            <ActionButton onClick={onPickGit}>{t('common.browse')}</ActionButton>
          </div>
        </div>
        <div>
          <FieldLabel>{t('settings.git.defaultRemote')}</FieldLabel>
          <TextInput
            value={form.defaultRemote}
            onChange={(e) => onChange({ defaultRemote: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>{t('settings.git.pullMode')}</FieldLabel>
          <select
            value={form.pullMode}
            onChange={(e) =>
              onChange({ pullMode: e.target.value as AppSettings['pullMode'] })
            }
            className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-sm text-gf-fg"
          >
            <option value="merge">{t('settings.git.pullModeMerge')}</option>
            <option value="rebase">{t('settings.git.pullModeRebase')}</option>
            <option value="ff-only">{t('settings.git.pullModeFfOnly')}</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 border-t border-gf-border pt-4">
        <h3 className="text-sm font-semibold text-gf-fg">{t('settings.git.submodules')}</h3>
        <div>
          <FieldLabel>{t('settings.git.submoduleRecursion')}</FieldLabel>
          <select
            value={form.submoduleRecursion}
            onChange={(e) =>
              onChange({
                submoduleRecursion: e.target.value as AppSettings['submoduleRecursion']
              })
            }
            className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-sm text-gf-fg"
          >
            <option value="none">{t('settings.git.submoduleRecursionNone')}</option>
            <option value="on-demand">{t('settings.git.submoduleRecursionOnDemand')}</option>
            <option value="always">{t('settings.git.submoduleRecursionAlways')}</option>
          </select>
        </div>
        <div>
          <FieldLabel>{t('settings.git.pushSubmoduleRecursion')}</FieldLabel>
          <select
            value={form.pushSubmoduleRecursion}
            onChange={(e) =>
              onChange({
                pushSubmoduleRecursion: e.target.value as AppSettings['pushSubmoduleRecursion']
              })
            }
            className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-sm text-gf-fg"
          >
            <option value="no">{t('settings.git.pushSubmoduleRecursionNo')}</option>
            <option value="check">{t('settings.git.pushSubmoduleRecursionCheck')}</option>
            <option value="on-demand">{t('settings.git.pushSubmoduleRecursionOnDemand')}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
