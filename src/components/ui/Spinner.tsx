type SpinnerSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-3 w-3 border',
  md: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2'
}

export function Spinner({
  size = 'md',
  className = ''
}: {
  size?: SpinnerSize
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
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
