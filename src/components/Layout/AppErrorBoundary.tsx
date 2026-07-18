import { Component, type ErrorInfo, type ReactNode } from 'react'
import { appLog } from '@/stores/logs'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const details = [error.message, info.componentStack?.trim()].filter(Boolean).join('\n')
    appLog('error', 'Renderer UI crashed', details || undefined)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen flex-col items-center justify-center gap-3 bg-gf-bg px-6 text-center text-gf-fg">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-gf-muted">
            {this.state.error.message || 'An unexpected error occurred in the GitFreddo UI.'}
          </p>
          <button
            type="button"
            className="rounded border border-gf-border bg-gf-panel px-3 py-1.5 text-sm hover:bg-gf-bg"
            onClick={this.handleReload}
          >
            Reload window
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
