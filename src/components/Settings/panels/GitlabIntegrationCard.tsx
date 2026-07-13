import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, TextInput } from '@/components/Ui/Modal'
import { useGitlabStatus, useInvalidateGitlabStatus, useSetGitlabStatus } from '@/hooks/useGitlabStatus'
import { IntegrationSshKeyStatus } from '@/components/Settings/panels/IntegrationSshKeyStatus'
import { useToastStore } from '@/stores/toast'

type ConnectMode = 'oauth' | 'pat'

export function GitlabIntegrationCard() {
  const { t } = useTranslation()
  const { data: status, isLoading } = useGitlabStatus()
  const invalidate = useInvalidateGitlabStatus()
  const setStatus = useSetGitlabStatus()
  const show = useToastStore((s) => s.show)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [mode, setMode] = useState<ConnectMode>('oauth')
  const [pat, setPat] = useState('')
  const [host, setHost] = useState('')
  const [progress, setProgress] = useState<{ status: string; authorizationUri?: string } | null>(null)
  const [uploadingKey, setUploadingKey] = useState(false)

  const connected = status?.connected ?? false
  const login = status?.login ?? null
  const avatarUrl = status?.avatarUrl ?? null
  const sshKeyTitle = status?.sshKeyTitle ?? null

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onGitlabConnectProgress((next) => {
      setProgress(next)
    })
    return unsubscribe
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setProgress(null)
    try {
      const trimmedHost = host.trim() || undefined
      const result =
        mode === 'pat'
          ? await window.gitfreddo.gitlabConnectPat(pat, trimmedHost)
          : await window.gitfreddo.gitlabConnect()
      setStatus(result)
      await invalidate()
      show(t('toast.gitlab.connected', { login: result.login ?? '' }), 'success')
      setPat('')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setConnecting(false)
      setProgress(null)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await window.gitfreddo.gitlabDisconnect()
      await invalidate()
      show(t('toast.gitlab.disconnected'), 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleUploadSshKey() {
    setUploadingKey(true)
    try {
      const result = await window.gitfreddo.gitlabUploadSshKey(`GitFreddo ${new Date().toISOString()}`)
      await invalidate()
      show(t('toast.gitlab.sshKeyUploaded', { title: result.title }), 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setUploadingKey(false)
    }
  }

  return (
    <div className="rounded border border-gf-border-strong p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gf-fg">{t('settings.gitlab.title')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gf-fg-subtle">
            {t('settings.gitlab.description')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded px-2 py-0.5 text-[11px] ${
              connected
                ? 'bg-gf-accent/15 text-gf-accent'
                : 'bg-gf-surface-hover text-gf-fg-muted'
            }`}
          >
            {isLoading
              ? '…'
              : connected
                ? t('settings.gitlab.connected')
                : t('settings.gitlab.notConnected')}
          </span>
          {connected && sshKeyTitle && (
            <span
              className="max-w-[12rem] truncate rounded bg-gf-accent/10 px-2 py-0.5 text-[11px] text-gf-accent"
              title={sshKeyTitle}
            >
              {t('settings.gitlab.sshKeyActive')}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        {connected && login ? (
          <div className="flex items-center gap-2">
            {avatarUrl && (
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-gf-border" />
            )}
            <p className="text-xs text-gf-fg">{t('settings.gitlab.signedInAs', { login })}</p>
          </div>
        ) : (
          <p className="text-xs text-gf-fg-muted">{t('settings.gitlab.noAccount')}</p>
        )}
        {connected && <IntegrationSshKeyStatus sshKeyTitle={sshKeyTitle} namespace="gitlab" />}
      </div>

      {!connected && (
        <div className="mt-3 flex gap-2">
          {(['oauth', 'pat'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded border px-2 py-1 text-[11px] capitalize ${
                mode === value
                  ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                  : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
              }`}
            >
              {value === 'oauth' ? t('settings.gitlab.oauth') : t('settings.gitlab.token')}
            </button>
          ))}
        </div>
      )}

      {!connected && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] text-gf-fg-muted">
            {t('settings.gitlab.host')}
          </label>
          <TextInput
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={t('settings.gitlab.hostPlaceholder')}
            autoComplete="off"
          />
        </div>
      )}

      {!connected && mode === 'pat' && (
        <div className="mt-3">
          <TextInput
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder={t('settings.gitlab.patPlaceholder')}
            autoComplete="off"
          />
        </div>
      )}

      {connecting && progress?.status === 'waiting' && (
        <div className="mt-3 rounded border border-gf-border bg-gf-bg/60 p-2">
          <p className="text-xs text-gf-fg-subtle">{t('settings.gitlab.waitingAuth')}</p>
          {progress.authorizationUri && (
            <p className="mt-1 break-all text-[11px] text-gf-fg-subtle">{progress.authorizationUri}</p>
          )}
        </div>
      )}

      {connecting && progress?.status === 'exchanging' && (
        <p className="mt-2 text-xs text-gf-fg-subtle">{t('settings.gitlab.exchangingToken')}</p>
      )}

      {connecting && !progress && mode === 'oauth' && (
        <p className="mt-2 text-xs text-gf-fg-subtle">{t('settings.gitlab.startingAuth')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {connected ? (
          <>
            <ActionButton onClick={() => void handleDisconnect()} disabled={disconnecting}>
              {disconnecting ? t('settings.gitlab.disconnecting') : t('settings.gitlab.disconnect')}
            </ActionButton>
            <ActionButton onClick={() => void handleUploadSshKey()} disabled={uploadingKey}>
              {uploadingKey ? t('settings.gitlab.uploading') : t('settings.gitlab.uploadSshKey')}
            </ActionButton>
          </>
        ) : (
          <ActionButton
            variant="primary"
            onClick={() => void handleConnect()}
            disabled={connecting || isLoading || (mode === 'pat' && !pat.trim())}
          >
            {connecting
              ? t('settings.gitlab.connecting')
              : mode === 'pat'
                ? t('settings.gitlab.connectWithToken')
                : t('settings.gitlab.connectWithGitlab')}
          </ActionButton>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gf-fg-subtle">
        {t('settings.gitlab.tokenHint')}
      </p>
    </div>
  )
}
