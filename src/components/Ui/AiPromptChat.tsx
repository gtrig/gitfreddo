import { useEffect, useRef, type KeyboardEvent } from 'react'
import { ActionButton, TextArea } from '@/components/Ui/Modal'
import { Spinner } from '@/components/Ui/Spinner'
import type { AiChatMessage } from '@shared/ai'

export interface AiPromptChatLabels {
  title: string
  hint: string
  emptyMessage: string
  placeholder: string
  sendLabel: string
  youLabel: string
  assistantLabel: string
  thinkingLabel: string
}

interface AiPromptChatProps {
  labels: AiPromptChatLabels
  messages: AiChatMessage[]
  input: string
  busy: boolean
  onInputChange: (value: string) => void
  onSend: () => void
}

export function AiPromptChat({
  labels,
  messages,
  input,
  busy,
  onInputChange,
  onSend
}: AiPromptChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const canSend = input.trim().length > 0 && !busy

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, busy])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        onSend()
      }
    }
  }

  return (
    <section className="rounded border border-gf-border-strong bg-gf-bg-deep">
      <div className="border-b border-gf-border-strong px-3 py-2">
        <h3 className="text-xs font-semibold text-gf-fg-muted">{labels.title}</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gf-fg-subtle">{labels.hint}</p>
      </div>

      <div
        ref={scrollRef}
        className="max-h-40 space-y-2 overflow-y-auto px-3 py-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-gf-fg-subtle">{labels.emptyMessage}</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`rounded px-2.5 py-1.5 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'ml-6 bg-gf-surface-hover/70 text-gf-fg'
                  : 'mr-6 bg-violet-950/40 text-gf-fg'
              }`}
            >
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gf-fg-subtle">
                {message.role === 'user' ? labels.youLabel : labels.assistantLabel}
              </span>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
        {busy && messages.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-gf-fg-muted">
            <Spinner size="sm" />
            {labels.thinkingLabel}
          </div>
        ) : null}
      </div>

      <div className="border-t border-gf-border-strong p-3">
        <TextArea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={labels.placeholder}
          rows={2}
          disabled={busy}
          className="resize-y"
          aria-label={labels.placeholder}
        />
        <div className="mt-2 flex justify-end">
          <ActionButton variant="secondary" disabled={!canSend} onClick={onSend}>
            {labels.sendLabel}
          </ActionButton>
        </div>
      </div>
    </section>
  )
}
