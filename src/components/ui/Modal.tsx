import { useEffect, useRef, type ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { Spinner } from '@/components/ui/Spinner'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
}

export function Modal({ title, open, onClose, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) {
      return
    }
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`w-full rounded-lg border border-gf-border-strong bg-gf-bg shadow-xl outline-none ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gf-border px-4 py-3">
          <h2 id="modal-title" className="text-sm font-semibold text-gf-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gf-fg-subtle hover:text-gf-fg-muted"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  busy = false
}: ConfirmDialogProps) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <p className="mb-4 text-sm text-gf-fg-muted">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded border border-gf-border-strong px-3 py-1.5 text-xs text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded bg-gf-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-gf-fg-muted">
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg outline-none focus:border-gf-accent ${props.className ?? ''}`}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg outline-none focus:border-gf-accent ${props.className ?? ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg outline-none focus:border-gf-accent ${props.className ?? ''}`}
    />
  )
}

export function ActionButton({
  children,
  variant = 'secondary',
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}) {
  const styles =
    variant === 'primary'
      ? 'bg-gf-accent text-white hover:opacity-90'
      : variant === 'danger'
        ? 'border border-red-800 text-red-300 hover:bg-red-950'
        : 'border border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'

  const spinnerClass =
    variant === 'primary'
      ? 'border-white/30 border-t-white'
      : variant === 'danger'
        ? 'border-red-400/30 border-t-red-300'
        : ''

  return (
    <button
      type="button"
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${styles} ${props.className ?? ''}`}
    >
      {loading && <Spinner size="sm" className={spinnerClass} />}
      {children}
    </button>
  )
}
