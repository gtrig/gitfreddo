import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal, FieldLabel, TextInput, ActionButton } from '@/components/ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'
import { useToastStore } from '@/stores/toast'

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

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void window.gitfredo
      .getSettings()
      .then((settings) => setForm(settings))
      .finally(() => setLoading(false))
  }, [open])

  async function handlePickGit() {
    const path = await window.gitfredo.pickGitBinary()
    if (path && form) {
      setForm({ ...form, gitBinaryPath: path })
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
    <Modal title="Settings" open={open} onClose={onClose}>
      {loading || !form ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div>
            <FieldLabel>git binary path</FieldLabel>
            <div className="flex gap-2">
              <TextInput
                value={form.gitBinaryPath}
                onChange={(e) => setForm({ ...form, gitBinaryPath: e.target.value })}
              />
              <ActionButton onClick={() => void handlePickGit()}>Browse</ActionButton>
            </div>
          </div>

          <div>
            <FieldLabel>Default remote</FieldLabel>
            <TextInput
              value={form.defaultRemote}
              onChange={(e) => setForm({ ...form, defaultRemote: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel>Poll interval (ms, 0 = off)</FieldLabel>
            <TextInput
              type="number"
              value={String(form.pollIntervalMs)}
              onChange={(e) =>
                setForm({ ...form, pollIntervalMs: Number.parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>

          <div>
            <FieldLabel>Commit graph max commits</FieldLabel>
            <TextInput
              type="number"
              value={String(form.logMaxCount)}
              onChange={(e) =>
                setForm({ ...form, logMaxCount: Number.parseInt(e.target.value, 10) || 500 })
              }
            />
          </div>

          <div>
            <FieldLabel>External editor command (optional)</FieldLabel>
            <TextInput
              value={form.editorCommand}
              onChange={(e) => setForm({ ...form, editorCommand: e.target.value })}
              placeholder="code --wait"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </ActionButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
