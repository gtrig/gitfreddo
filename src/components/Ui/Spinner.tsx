import { useTranslation } from 'react-i18next'

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-3 w-3 border',
  md: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2',
  xl: 'h-10 w-10 border-[3px]'
}

export function Spinner({
  size = 'md',
  className = '',
  label
}: {
  size?: SpinnerSize
  className?: string
  label?: string
}) {
  const { t } = useTranslation()
  const ariaLabel = label ?? t('common.loading')

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-block shrink-0 animate-spin rounded-full border-gf-fg-subtle border-t-gf-accent ${sizeClasses[size]} ${className}`}
    />
  )
}

export function LoadingRow({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gf-fg-subtle">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  )
}
