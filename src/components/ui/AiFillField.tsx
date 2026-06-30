import { useEffect, useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import type { AiFillContext, AiFillPurpose } from '../../../shared/ai'
import { FieldLabel, TextArea, TextInput } from './Modal'

interface AiFillFieldBaseProps {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  purpose: AiFillPurpose
  context?: AiFillContext
}

type AiFillTextAreaProps = AiFillFieldBaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>

type AiFillTextInputProps = AiFillFieldBaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

function FourRayStarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <line x1="8" y1="1.5" x2="8" y2="14.5" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" />
      <line x1="3.1" y1="3.1" x2="12.9" y2="12.9" />
      <line x1="12.9" y1="3.1" x2="3.1" y2="12.9" />
    </svg>
  )
}

function AiFillStarButton({
  pending,
  onClick,
  positionClassName
}: {
  pending: boolean
  onClick: () => void
  positionClassName: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={pending ? 'Filling with AI…' : 'Fill with AI'}
      title={pending ? 'Filling…' : 'Fill with AI (Ctrl+Shift+Space)'}
      className={`absolute right-2 flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${positionClassName}`}
    >
      <FourRayStarIcon className={`h-3.5 w-3.5 ${pending ? 'animate-pulse' : ''}`} />
    </button>
  )
}

function useAiFillHandler(
  purpose: AiFillPurpose,
  value: string,
  context: AiFillContext | undefined,
  onChange: (value: string) => void
) {
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const show = useToastStore((s) => s.show)

  async function handleFill() {
    try {
      const text = await aiFill.mutateAsync({
        purpose,
        context: { ...context, currentText: value }
      })
      onChange(text)
    } catch (error) {
      show(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return { aiEnabled, aiFill, handleFill }
}

function useAiFillShortcut(enabled: boolean, onFill: () => void) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    const node = containerRef.current
    if (!node) return

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (!target || !node?.contains(target)) return
      const mod = event.ctrlKey || event.metaKey
      if (!mod || !event.shiftKey || event.code !== 'Space') return
      event.preventDefault()
      onFill()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, onFill])

  return containerRef
}

export function AiFillTextArea({
  label,
  value,
  onChange,
  purpose,
  context,
  className,
  ...textareaProps
}: AiFillTextAreaProps) {
  const { aiEnabled, aiFill, handleFill } = useAiFillHandler(purpose, value, context, onChange)
  const containerRef = useAiFillShortcut(aiEnabled, () => void handleFill())

  return (
    <div ref={containerRef}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${aiEnabled ? 'pr-9' : ''} ${className ?? ''}`}
          {...textareaProps}
        />
        {aiEnabled && (
          <AiFillStarButton
            pending={aiFill.isPending}
            onClick={() => void handleFill()}
            positionClassName="top-2"
          />
        )}
      </div>
    </div>
  )
}

export function AiFillTextInput({
  label,
  value,
  onChange,
  purpose,
  context,
  className,
  ...inputProps
}: AiFillTextInputProps) {
  const { aiEnabled, aiFill, handleFill } = useAiFillHandler(purpose, value, context, onChange)
  const containerRef = useAiFillShortcut(aiEnabled, () => void handleFill())

  return (
    <div ref={containerRef}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${aiEnabled ? 'pr-9' : ''} ${className ?? ''}`}
          {...inputProps}
        />
        {aiEnabled && (
          <AiFillStarButton
            pending={aiFill.isPending}
            onClick={() => void handleFill()}
            positionClassName="top-1/2 -translate-y-1/2"
          />
        )}
      </div>
    </div>
  )
}
