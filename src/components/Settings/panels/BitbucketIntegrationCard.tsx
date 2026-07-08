import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, TextInput } from '@/components/Ui/Modal'
import { useBitbucketStatus, useInvalidateBitbucketStatus, useSetBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useToastStore } from '@/stores/toast'

type ConnectMode = 'oauth' | 'app_password'

export function BitbucketIntegrationCard() {
  const { t } = useTranslation()
  const { data: status, isLoading } = useBitbucketStatus()
  const invalidate = useInvalidateBitbucketStatus()
  const setStatus = useSetBitbucketStatus()
  const show = useToastStore((s) => s.show)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [mode, setMode] = useState<ConnectMode>('oauth')
  const [username, setUsername] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [progress, setProgress] = useState<{ status: string; authorizationUri?: string } | null>(null)
  const [uploadingKey, setUploadingKey] = useState(false)

  const connected = status?.connected ?? false
  const login = status?.login ?? null
  const avatarUrl = status?.avatarUrl ?? null

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onBitbucketConnectProgress((next) => {
      setProgress(next)
    })
    return unsubscribe
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setProgress(null)
    try {
      const result =
        mode === 'app_password'
          ? await window.gitfreddo.bitbucketConnectAppPassword(username, appPassword)
          : await window.gitfreddo.bitbucketConnect()
      setStatus(result)
      await invalidate()
      show(t('toast.bitbucket.connected', { login: result.login ?? '' }), 'success')
      setUsername('')
      setAppPassword('')
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
      await window.gitfreddo.bitbucketDisconnect()
      await invalidate()
      show(t('toast.bitbucket.disconnected'), 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleUploadSshKey() {
    setUploadingKey(true)
    try {
      const result = await window.gitfreddo.bitbucketUploadSshKey(
        `GitFreddo ${new Date().toISOString()}`
      )
      show(t('toast.bitbucket.sshKeyUploaded', { title: result.title }), 'success')
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
          <h3 className="text-sm font-medium text-gf-fg">{t('settings.bitbucket.title')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gf-fg-subtle">
            {t('settings.bitbucket.description')}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[11px] ${
            connected
              ? 'bg-gf-accent/15 text-gf-accent'
              : 'bg-gf-surface-hover text-gf-fg-muted'
          }`}
        >
          {isLoading
            ? '…'
            : connected
              ? t('settings.bitbucket.connected')
              : t('settings.bitbucket.notConnected')}
        </span>
      </div>

      <div className="mt-3">
        {connected && login ? (
          <div className="flex items-center gap-2">
            {avatarUrl && (
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-gf-border" />
            )}
            <p className="text-xs text-gf-fg">{t('settings.bitbucket.signedInAs', { login })}</p>
          </div>
        ) : (
          <p className="text-xs text-gf-fg-muted">{t('settings.bitbucket.noAccount')}</p>
        )}
      </div>

      {!connected && (
        <div className="mt-3 flex gap-2">
          {(['oauth', 'app_password'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded border px-2 py-1 text-[11px] ${
                mode === value
                  ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                  : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
              }`}
            >
              {value === 'oauth'
                ? t('settings.bitbucket.oauth')
                : t('settings.bitbucket.appPassword')}
            </button>
          ))}
        </div>
      )}

      {!connected && mode === 'app_password' && (
        <div className="mt-3 space-y-2">
          <TextInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('settings.bitbucket.usernamePlaceholder')}
            autoComplete="username"
          />
          <TextInput
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder={t('settings.bitbucket.appPasswordPlaceholder')}
            autoComplete="off"
          />
        </div>
      )}

      {connecting && progress?.status === 'waiting' && (
        <div className="mt-3 rounded border border-gf-border bg-gf-bg/60 p-2">
          <p className="text-xs text-gf-fg-subtle">{t('settings.bitbucket.waitingAuth')}</p>
          {progress.authorizationUri && (
            <p className="mt-1 break-all text-[11px] text-gf-fg-subtle">{progress.authorizationUri}</p>
          )}
        </div>
      )}

      {connecting && progress?.status === 'exchanging' && (
        <p className="mt-2 text-xs text-gf-fg-subtle">{t('settings.bitbucket.exchangingToken')}</p>
      )}

      {connecting && !progress && mode === 'oauth' && (
        <p className="mt-2 text-xs text-gf-fg-subtle">{t('settings.bitbucket.startingAuth')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {connected ? (
          <>
            <ActionButton onClick={() => void handleDisconnect()} disabled={disconnecting}>
              {disconnecting
                ? t('settings.bitbucket.disconnecting')
                : t('settings.bitbucket.disconnect')}
            </ActionButton>
            <ActionButton onClick={() => void handleUploadSshKey()} disabled={uploadingKey}>
              {uploadingKey
                ? t('settings.bitbucket.uploading')
                : t('settings.bitbucket.uploadSshKey')}
            </ActionButton>
          </>
        ) : (
          <ActionButton
            variant="primary"
            onClick={() => void handleConnect()}
            disabled={
              connecting ||
              isLoading ||
              (mode === 'app_password' && (!username.trim() || !appPassword.trim()))
            }
          >
            {connecting
              ? t('settings.bitbucket.connecting')
              : mode === 'app_password'
                ? t('settings.bitbucket.connectWithAppPassword')
                : t('settings.bitbucket.connectWithBitbucket')}
          </ActionButton>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gf-fg-subtle">
        {t('settings.bitbucket.tokenHint')}
      </p>
    </div>
  )
}
