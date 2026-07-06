import { SparklesIcon } from '@heroicons/react/24/outline'
import { Spinner } from '@/components/Ui/Spinner'

export type AiActionButtonVariant = 'toolbar' | 'detail' | 'pill' | 'icon'

/** Vibrant violet→cyan gradient outline over theme deep background. */
const gradientOutline =
  'border border-transparent [background-image:linear-gradient(var(--gf-bg-deep),var(--gf-bg-deep)),linear-gradient(90deg,#a78bfa,#38bdf8)] [background-origin:border-box] [background-clip:padding-box,border-box]'

const variantClasses: Record<AiActionButtonVariant, string> = {
  toolbar: `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] text-gf-fg-muted hover:text-gf-fg disabled:opacity-50 ${gradientOutline}`,
  detail: `inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs text-gf-fg-muted hover:text-gf-fg disabled:opacity-50 ${gradientOutline}`,
  pill: `inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gf-fg-muted hover:text-gf-fg disabled:opacity-50 ${gradientOutline}`,
  icon: `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-violet-400 hover:text-violet-300 disabled:opacity-40 ${gradientOutline}`
}

const iconSizeClasses: Record<AiActionButtonVariant, string> = {
  toolbar: 'h-3 w-3',
  detail: 'h-3 w-3',
  pill: 'h-3 w-3',
  icon: 'h-3 w-3'
}

export function AiActionButton({
  variant = 'toolbar',
  loading = false,
  children,
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AiActionButtonVariant
  loading?: boolean
}) {
  const showLabel = variant !== 'icon' && children != null && children !== false

  return (
    <button
      type={type}
      className={`group ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <SparklesIcon
          className={`${iconSizeClasses[variant]} shrink-0 text-violet-400 group-hover:text-violet-300`}
          aria-hidden
        />
      )}
      {showLabel ? children : null}
    </button>
  )
}
