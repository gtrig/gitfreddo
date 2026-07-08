import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, TextInput } from '@/components/Ui/Modal'
import { useGitHubStatus, useInvalidateGitHubStatus, useSetGitHubStatus } from '@/hooks/useGitHubStatus'
import { IntegrationSshKeyStatus } from '@/components/Settings/panels/IntegrationSshKeyStatus'
import { useToastStore } from '@/stores/toast'

type ConnectMode = 'oauth' | 'pat'

export function GithubIntegrationCard() {
  const { t } = useTranslation()
  const { data: status, isLoading } = useGitHubStatus()
  const invalidate = useInvalidateGitHubStatus()
  const setStatus = useSetGitHubStatus()
  const show = useToastStore((s) => s.show)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [mode, setMode] = useState<ConnectMode>('oauth')
  const [pat, setPat] = useState('')
  const [progress, setProgress] = useState<{ userCode: string; verificationUri: string } | null>(
    null
  )
  const [uploadingKey, setUploadingKey] = useState(false)

  const connected = status?.connected ?? false
  const login = status?.login ?? null
  const avatarUrl = status?.avatarUrl ?? null
  const sshKeyTitle = status?.sshKeyTitle ?? null

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onGitHubConnectProgress((next) => {
      setProgress(next)
    })
    return unsubscribe
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setProgress(null)
    try {
      const result =
        mode === 'pat'
          ? await window.gitfreddo.githubConnectPat(pat)
          : await window.gitfreddo.githubConnect()
      setStatus(result)
      await invalidate()
      show(t('toast.github.connected', { login: result.login }), 'success')
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
      await window.gitfreddo.githubDisconnect()
      await invalidate()
      show(t('toast.github.disconnected'), 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleUploadSshKey() {
    setUploadingKey(true)
    try {
      const result = await window.gitfreddo.githubUploadSshKey(`GitFreddo ${new Date().toISOString()}`)
      await invalidate()
      show(t('toast.github.sshKeyUploaded', { title: result.title }), 'success')
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
          <h3 className="text-sm font-medium text-gf-fg">{t('settings.github.title')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gf-fg-subtle">
            {t('settings.github.description')}
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
            {isLoading ? '…' : connected ? t('settings.github.connected') : t('settings.github.notConnected')}
          </span>
          {connected && sshKeyTitle && (
            <span
              className="max-w-[12rem] truncate rounded bg-gf-accent/10 px-2 py-0.5 text-[11px] text-gf-accent"
              title={sshKeyTitle}
            >
              {t('settings.github.sshKeyActive')}
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
            <p className="text-xs text-gf-fg">
              {t('settings.github.signedInAs', { login })}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gf-fg-muted">{t('settings.github.noAccount')}</p>
        )}
        {connected && <IntegrationSshKeyStatus sshKeyTitle={sshKeyTitle} namespace="github" />}
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
              {value === 'oauth' ? t('settings.github.oauth') : t('settings.github.token')}
            </button>
          ))}
        </div>
      )}

      {!connected && mode === 'pat' && (
        <div className="mt-3">
          <TextInput
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder={t('settings.github.patPlaceholder')}
            autoComplete="off"
          />
        </div>
      )}

      {connecting && progress && (
        <div className="mt-3 rounded border border-gf-border bg-gf-bg/60 p-2">
          <p className="text-xs text-gf-fg-subtle">
            {t('settings.github.enterCode')}{' '}
            <span className="font-mono text-sm font-semibold text-gf-fg">{progress.userCode}</span>
          </p>
          <p className="mt-1 text-[11px] text-gf-fg-subtle">
            {t('settings.github.waitingAuth')}
          </p>
        </div>
      )}

      {connecting && !progress && mode === 'oauth' && (
        <p className="mt-2 text-xs text-gf-fg-subtle">{t('settings.github.startingAuth')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {connected ? (
          <>
            <ActionButton onClick={() => void handleDisconnect()} disabled={disconnecting}>
              {disconnecting ? t('settings.github.disconnecting') : t('settings.github.disconnect')}
            </ActionButton>
            <ActionButton onClick={() => void handleUploadSshKey()} disabled={uploadingKey}>
              {uploadingKey ? t('settings.github.uploading') : t('settings.github.uploadSshKey')}
            </ActionButton>
          </>
        ) : (
          <ActionButton
            variant="primary"
            onClick={() => void handleConnect()}
            disabled={connecting || isLoading || (mode === 'pat' && !pat.trim())}
          >
            {connecting
              ? t('settings.github.connecting')
              : mode === 'pat'
                ? t('settings.github.connectWithToken')
                : t('settings.github.connectWithGithub')}
          </ActionButton>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gf-fg-subtle">
        {t('settings.github.tokenHint')}
      </p>
    </div>
  )
}
