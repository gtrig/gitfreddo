import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLogStore, type LogTab } from '@/stores/logs'
import { copyToClipboard } from '@/lib/clipboard'
import type { LogEntry, LogLevel } from '@shared/ipc'
import { VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'

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
  const { t } = useTranslation()

  const handleCopy = useCallback(() => {
    const text = entry.details ? `${entry.message}\n${entry.details}` : entry.message
    void copyToClipboard(text)
  }, [entry])

  return (
    <div className="group relative border-b border-gf-border/60 px-3 py-1 pr-7 font-mono text-[11px] leading-relaxed">
      <span className="text-gf-fg-subtle">{formatTime(entry.timestamp)}</span>{' '}
      <span className={LEVEL_STYLES[entry.level]}>{entry.message}</span>
      {entry.details && (
        <pre className="mt-0.5 whitespace-pre-wrap break-all text-gf-fg-subtle">{entry.details}</pre>
      )}
      <button
        type="button"
        onClick={handleCopy}
        title={t('tools.copyLogLine')}
        aria-label={t('tools.copyLogLine')}
        className="absolute right-1.5 top-1 rounded p-0.5 text-gf-fg-subtle opacity-0 transition hover:bg-gf-surface-hover hover:text-gf-fg group-hover:opacity-100"
      >
        <ClipboardIcon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

function LogList({
  entries,
  emptyMessage
}: {
  entries: LogEntry[]
  emptyMessage?: string
}) {
  const { t } = useTranslation()
  const message = emptyMessage ?? t('tools.noLogEntries')
  const containerRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const useVirtualization = shouldVirtualize(entries.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? entries.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const entry = entries[index]
      return entry?.details ? 48 : 24
    },
    overscan: VIRTUAL_OVERSCAN,
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el.getBoundingClientRect().height
        : undefined
  })

  const onScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedRef.current = distanceFromBottom < 48
  }, [])

  useEffect(() => {
    if (!pinnedRef.current) return
    if (useVirtualization) {
      virtualizer.scrollToIndex(entries.length - 1, { align: 'end' })
    } else {
      const el = containerRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  // virtualizer reference is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, useVirtualization])

  if (entries.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-gf-fg-subtle">{message}</p>
  }

  return (
    <div ref={containerRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto">
      {useVirtualization ? (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const entry = entries[virtualItem.index]!
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%',
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <LogLine entry={entry} />
              </div>
            )
          })}
        </div>
      ) : (
        entries.map((entry) => (
          <LogLine key={entry.id} entry={entry} />
        ))
      )}
    </div>
  )
}

function GitListenSwitch() {
  const { t } = useTranslation()
  const gitListening = useLogStore((s) => s.gitListening)
  const setGitListening = useLogStore((s) => s.setGitListening)

  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gf-fg-subtle">
      <button
        type="button"
        role="switch"
        aria-checked={gitListening}
        aria-label={t('tools.listenGitAria')}
        title={t('tools.listenGitTitle')}
        onClick={() => setGitListening(!gitListening)}
        className={`relative h-4 w-7 shrink-0 rounded-full transition ${
          gitListening ? 'bg-emerald-600' : 'bg-gf-surface-hover'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${
            gitListening ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </button>
      {t('tools.listen')}
    </label>
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
  const { t } = useTranslation()
  const open = useLogStore((s) => s.open)
  const height = useLogStore((s) => s.height)
  const activeTab = useLogStore((s) => s.activeTab)
  const gitEntries = useLogStore((s) => s.gitEntries)
  const appEntries = useLogStore((s) => s.appEntries)
  const toggleOpen = useLogStore((s) => s.toggleOpen)
  const setOpen = useLogStore((s) => s.setOpen)
  const setHeight = useLogStore((s) => s.setHeight)
  const setActiveTab = useLogStore((s) => s.setActiveTab)
  const gitListening = useLogStore((s) => s.gitListening)
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
          {open ? '▼' : '▲'} {t('tools.logs')}
          {!open && totalCount > 0 && (
            <span className="ml-1.5 text-gf-fg-subtle">({totalCount})</span>
          )}
        </button>

        {open && (
          <>
            <TabButton
              active={activeTab === 'git'}
              label={t('tools.git')}
              count={gitEntries.length}
              onClick={() => setActiveTab('git')}
            />
            <TabButton
              active={activeTab === 'app'}
              label={t('tools.application')}
              count={appEntries.length}
              onClick={() => setActiveTab('app' as LogTab)}
            />
            {activeTab === 'git' && <GitListenSwitch />}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => clear(activeTab)}
              className="rounded px-2 py-0.5 text-[11px] text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted"
            >
              {t('tools.clear')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-0.5 text-[11px] text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted"
            >
              {t('common.close')}
            </button>
          </>
        )}

        {!open && <div className="flex-1" />}
      </div>

      {open && (
        <LogList
          entries={entries}
          emptyMessage={
            activeTab === 'git' && !gitListening ? t('tools.gitLoggingOff') : undefined
          }
        />
      )}
    </div>
  )
}

export function LogToggleButton() {
  const { t } = useTranslation()
  const toggleOpen = useLogStore((s) => s.toggleOpen)
  const open = useLogStore((s) => s.open)
  const gitCount = useLogStore((s) => s.gitEntries.length)
  const appCount = useLogStore((s) => s.appEntries.length)
  const total = gitCount + appCount

  return (
    <button
      type="button"
      onClick={toggleOpen}
      className={`relative inline-flex h-7 w-7 items-center justify-center rounded border text-xs ${
        open
          ? 'border-gf-border-strong bg-gf-surface text-gf-fg'
          : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg'
      }`}
      title={t('tools.toggleLogDrawer')}
      aria-label={total > 0 ? t('tools.logsWithCount', { count: total }) : t('tools.logs')}
    >
      <DocumentTextIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {total > 0 && (
        <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gf-surface px-0.5 text-[9px] leading-none text-gf-fg-subtle ring-1 ring-gf-border-strong">
          {total > 99 ? '99+' : total}
        </span>
      )}
    </button>
  )
}

export function useLogSubscription(): void {
  const append = useLogStore((s) => s.append)

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onLogEntry((entry) => {
      if (entry.stream === 'git' && !useLogStore.getState().gitListening) {
        return
      }
      append(entry)
    })
    return unsubscribe
  }, [append])
}
