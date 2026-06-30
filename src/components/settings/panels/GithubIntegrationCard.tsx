import { useState } from 'react'
import { ActionButton } from '@/components/ui/Modal'
import { useGitHubStatus, useInvalidateGitHubStatus } from '@/hooks/useGitHubStatus'
import { useToastStore } from '@/stores/toast'

export function GithubIntegrationCard() {
  const { data: status, isLoading } = useGitHubStatus()
  const invalidate = useInvalidateGitHubStatus()
  const show = useToastStore((s) => s.show)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const connected = status?.connected ?? false
  const login = status?.login ?? null

  async function handleConnect() {
    setConnecting(true)
    try {
      const result = await window.gitfredo.githubConnect()
      await invalidate()
      show(`Connected to GitHub as @${result.login}`, 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await window.gitfredo.githubDisconnect()
      await invalidate()
      show('Disconnected from GitHub', 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="rounded border border-gf-border-strong p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gf-fg">GitHub</h3>
          <p className="mt-1 text-xs leading-relaxed text-gf-fg-subtle">
            Sign in to authenticate git clone, fetch, push, and pull against GitHub HTTPS remotes.
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[11px] ${
            connected
              ? 'bg-gf-accent/15 text-gf-accent'
              : 'bg-gf-surface-hover text-gf-fg-muted'
          }`}
        >
          {isLoading ? '…' : connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <div className="mt-3">
        {connected && login ? (
          <p className="text-xs text-gf-fg">
            Signed in as <span className="font-medium">@{login}</span>
          </p>
        ) : (
          <p className="text-xs text-gf-fg-muted">No GitHub account linked.</p>
        )}
      </div>

      {connecting && (
        <p className="mt-2 text-xs text-gf-fg-subtle">
          Waiting for authorization in your browser… Enter the code shown on GitHub if prompted.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {connected ? (
          <ActionButton onClick={() => void handleDisconnect()} disabled={disconnecting}>
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </ActionButton>
        ) : (
          <ActionButton
            variant="primary"
            onClick={() => void handleConnect()}
            disabled={connecting || isLoading}
          >
            {connecting ? 'Connecting…' : 'Connect with GitHub'}
          </ActionButton>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gf-fg-subtle">
        Your access token is encrypted with the OS keychain and stored separately from settings.json.
      </p>
    </div>
  )
}
