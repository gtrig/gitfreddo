import { useCallback, useEffect, useRef, useState } from 'react'
import { useLogStore, type LogTab } from '@/stores/logs'
import type { LogEntry, LogLevel } from '../../../shared/ipc'

const LEVEL_STYLES: Record<LogLevel, string> = {
  info: 'text-gf-fg-muted',
  warn: 'text-amber-300',
  error: 'text-red-300',
  debug: 'text-gf-fg-subtle'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className="border-b border-gf-border/60 px-3 py-1 font-mono text-[11px] leading-relaxed">
      <span className="text-gf-fg-subtle">{formatTime(entry.timestamp)}</span>{' '}
      <span className={LEVEL_STYLES[entry.level]}>{entry.message}</span>
      {entry.details && (
        <pre className="mt-0.5 whitespace-pre-wrap break-all text-gf-fg-subtle">{entry.details}</pre>
      )}
    </div>
  )
}

function LogList({ entries }: { entries: LogEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  const onScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) {
      return
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedRef.current = distanceFromBottom < 48
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !pinnedRef.current) {
      return
    }
    el.scrollTop = el.scrollHeight
  }, [entries])

  if (entries.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-gf-fg-subtle">No log entries yet.</p>
  }

  return (
    <div ref={containerRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto">
      {entries.map((entry) => (
        <LogLine key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function TabButton({
  active,
  label,
  count,
  onClick
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs ${
        active
          ? 'bg-gf-surface text-gf-fg'
          : 'text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted'
      }`}
    >
      {label}
      {count > 0 && (
        <span className="ml-1.5 rounded bg-gf-surface-hover px-1.5 py-0.5 text-[10px] text-gf-fg-muted">
          {count}
        </span>
      )}
    </button>
  )
}

export function LogDrawer() {
  const open = useLogStore((s) => s.open)
  const height = useLogStore((s) => s.height)
  const activeTab = useLogStore((s) => s.activeTab)
  const gitEntries = useLogStore((s) => s.gitEntries)
  const appEntries = useLogStore((s) => s.appEntries)
  const toggleOpen = useLogStore((s) => s.toggleOpen)
  const setOpen = useLogStore((s) => s.setOpen)
  const setHeight = useLogStore((s) => s.setHeight)
  const setActiveTab = useLogStore((s) => s.setActiveTab)
  const clear = useLogStore((s) => s.clear)

  const [resizing, setResizing] = useState(false)
  const resizeStart = useRef({ y: 0, height: 220 })

  const onResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      resizeStart.current = { y: event.clientY, height }
      setResizing(true)
    },
    [height]
  )

  useEffect(() => {
    if (!resizing) {
      return
    }

    const onMove = (event: MouseEvent) => {
      const delta = resizeStart.current.y - event.clientY
      setHeight(resizeStart.current.height + delta)
    }

    const onUp = () => setResizing(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, setHeight])

  const entries = activeTab === 'git' ? gitEntries : appEntries
  const totalCount = gitEntries.length + appEntries.length

  return (
    <div
      className={`flex shrink-0 flex-col border-t border-gf-border bg-gf-bg-deep ${
        resizing ? 'select-none' : ''
      }`}
      style={{ height: open ? height : 32 }}
    >
      {open && (
        <div
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={onResizeStart}
          className="h-1 shrink-0 cursor-row-resize bg-gf-surface/80 hover:bg-gf-surface-hover"
        />
      )}

      <div className="flex shrink-0 items-center gap-2 border-b border-gf-border px-3 py-1.5">
        <button
          type="button"
          onClick={toggleOpen}
          className="text-xs text-gf-fg-muted hover:text-gf-fg"
          aria-expanded={open}
        >
          {open ? '▼' : '▲'} Logs
          {!open && totalCount > 0 && (
            <span className="ml-1.5 text-gf-fg-subtle">({totalCount})</span>
          )}
        </button>

        {open && (
          <>
            <TabButton
              active={activeTab === 'git'}
              label="Git"
              count={gitEntries.length}
              onClick={() => setActiveTab('git')}
            />
            <TabButton
              active={activeTab === 'app'}
              label="Application"
              count={appEntries.length}
              onClick={() => setActiveTab('app' as LogTab)}
            />
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => clear(activeTab)}
              className="rounded px-2 py-0.5 text-[11px] text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-0.5 text-[11px] text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted"
            >
              Close
            </button>
          </>
        )}
      </div>

      {open && <LogList entries={entries} />}
    </div>
  )
}

export function LogToggleButton() {
  const toggleOpen = useLogStore((s) => s.toggleOpen)
  const open = useLogStore((s) => s.open)
  const gitCount = useLogStore((s) => s.gitEntries.length)
  const appCount = useLogStore((s) => s.appEntries.length)
  const total = gitCount + appCount

  return (
    <button
      type="button"
      onClick={toggleOpen}
      className={`rounded border px-3 py-1 text-xs ${
        open
          ? 'border-gf-border-strong bg-gf-surface text-gf-fg'
          : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg'
      }`}
      title="Toggle log drawer (Ctrl+`)"
    >
      Logs
      {total > 0 && <span className="ml-1.5 text-gf-fg-subtle">({total})</span>}
    </button>
  )
}

export function useLogSubscription(): void {
  const append = useLogStore((s) => s.append)

  useEffect(() => {
    const unsubscribe = window.gitfredo.onLogEntry((entry) => {
      append(entry)
    })
    return unsubscribe
  }, [append])
}
