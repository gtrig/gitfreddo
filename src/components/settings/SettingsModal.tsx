import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { LoadingRow } from '@/components/ui/Spinner'
import type { AppSettings } from '@/hooks/useAppSettings'
import { useToastStore } from '@/stores/toast'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { GitSettingsPanel } from '@/components/settings/panels/GitSettingsPanel'
import { InterfaceSettingsPanel } from '@/components/settings/panels/InterfaceSettingsPanel'
import { AiSettingsPanel } from '@/components/settings/panels/AiSettingsPanel'
import { IntegrationsSettingsPanel } from '@/components/settings/panels/IntegrationsSettingsPanel'
import {
  loadSettingsSection,
  saveSettingsSection,
  type SettingsSection
} from '@/components/settings/settingsSections'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const queryClient = useQueryClient()
  const show = useToastStore((s) => s.show)
  const [form, setForm] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<SettingsSection>(() => loadSettingsSection())

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSection(loadSettingsSection())
    void window.gitfredo
      .getSettings()
      .then((settings) => setForm(settings))
      .finally(() => setLoading(false))
  }, [open])

  function updateForm(patch: Partial<AppSettings>) {
    setForm((current) => (current ? { ...current, ...patch } : current))
  }

  function selectSection(next: SettingsSection) {
    setSection(next)
    saveSettingsSection(next)
  }

  async function handlePickGit() {
    const path = await window.gitfredo.pickGitBinary()
    if (path && form) {
      updateForm({ gitBinaryPath: path })
    }
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      const saved = await window.gitfredo.setSettings(form)
      setForm(saved)
      await queryClient.invalidateQueries({ queryKey: ['app-settings'] })
      show('Settings saved', 'success')
      onClose()
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Settings" open={open} onClose={onClose} size="lg">
      {loading || !form ? (
        <LoadingRow />
      ) : (
        <>
          <div className="flex min-h-[280px] gap-4">
            <SettingsSidebar active={section} onSelect={selectSection} />
            <div className="min-w-0 flex-1">
              {section === 'git' && (
                <GitSettingsPanel form={form} onChange={updateForm} onPickGit={() => void handlePickGit()} />
              )}
              {section === 'interface' && (
                <InterfaceSettingsPanel form={form} onChange={updateForm} />
              )}
              {section === 'ai' && <AiSettingsPanel form={form} onChange={updateForm} />}
              {section === 'integrations' && <IntegrationsSettingsPanel />}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-gf-border pt-4">
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton variant="primary" onClick={() => void handleSave()} loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </ActionButton>
          </div>
        </>
      )}
    </Modal>
  )
}
