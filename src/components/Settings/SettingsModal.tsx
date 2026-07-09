import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import type { AppSettings } from '@/hooks/useAppSettings'
import { pickUserSettings } from '@shared/integration-settings'
import type { AppTheme } from '@/lib/themes'
import { setDocumentTheme } from '@/lib/themes'
import { useToastStore } from '@/stores/toast'
import { SettingsSidebar } from '@/components/Settings/SettingsSidebar'
import { GitSettingsPanel } from '@/components/Settings/panels/GitSettingsPanel'
import { InterfaceSettingsPanel } from '@/components/Settings/panels/InterfaceSettingsPanel'
import { AiSettingsPanel } from '@/components/Settings/panels/AiSettingsPanel'
import { IntegrationsSettingsPanel } from '@/components/Settings/panels/IntegrationsSettingsPanel'
import { MaintenanceSettingsPanel } from '@/components/Settings/panels/MaintenanceSettingsPanel'
import {
  loadSettingsSection,
  saveSettingsSection,
  type SettingsSection
} from '@/components/Settings/settingsSections'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const show = useToastStore((s) => s.show)
  const [form, setForm] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [committedTheme, setCommittedTheme] = useState<AppTheme | null>(null)
  const [section, setSection] = useState<SettingsSection>(() => loadSettingsSection())

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSection(loadSettingsSection())
    void window.gitfreddo
      .getSettings()
      .then((settings) => {
        setForm(settings)
        setCommittedTheme(settings.theme)
      })
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open || !form?.theme) return
    setDocumentTheme(form.theme)
  }, [open, form?.theme])

  function updateForm(patch: Partial<AppSettings>) {
    setForm((current) => (current ? { ...current, ...patch } : current))
  }

  function handleClose() {
    if (committedTheme) {
      setDocumentTheme(committedTheme)
    }
    onClose()
  }

  function selectSection(next: SettingsSection) {
    setSection(next)
    saveSettingsSection(next)
  }

  async function handlePickGit() {
    const path = await window.gitfreddo.pickGitBinary()
    if (path && form) {
      updateForm({ gitBinaryPath: path })
    }
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      const saved = await window.gitfreddo.setSettings(pickUserSettings(form))
      setForm(saved)
      setCommittedTheme(saved.theme)
      await queryClient.invalidateQueries({ queryKey: ['app-settings'] })
      show(t('settings.saved'), 'success')
      onClose()
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('settings.title')} open={open} onClose={handleClose} size="xl">
      {loading || !form ? (
        <LoadingRow />
      ) : (
        <>
          <div className="flex max-h-[min(75vh,40rem)] min-h-[320px] gap-4">
            <SettingsSidebar active={section} onSelect={selectSection} />
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
              {section === 'git' && (
                <GitSettingsPanel form={form} onChange={updateForm} onPickGit={() => void handlePickGit()} />
              )}
              {section === 'interface' && (
                <InterfaceSettingsPanel form={form} onChange={updateForm} />
              )}
              {section === 'ai' && <AiSettingsPanel form={form} onChange={updateForm} />}
              {section === 'integrations' && <IntegrationsSettingsPanel />}
              {section === 'maintenance' && (
                <MaintenanceSettingsPanel form={form} onChange={updateForm} />
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-gf-border pt-4">
            <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
            <ActionButton variant="primary" onClick={() => void handleSave()} loading={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </ActionButton>
          </div>
        </>
      )}
    </Modal>
  )
}
