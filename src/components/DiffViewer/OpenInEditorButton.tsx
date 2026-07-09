import { useTranslation } from 'react-i18next'

export function OpenInEditorButton({
  path,
  disabled = false,
  className = ''
}: {
  path?: string | null
  disabled?: boolean
  className?: string
}) {
  const { t } = useTranslation()

  if (!path) return null

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void window.gitfreddo.openInEditor(path)}
      className={`rounded border border-gf-border-strong px-2 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface disabled:opacity-40 ${className}`}
    >
      {t('diff.openInEditor')}
    </button>
  )
}
