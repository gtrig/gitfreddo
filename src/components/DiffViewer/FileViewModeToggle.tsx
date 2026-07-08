import { useTranslation } from 'react-i18next'
import {
  FILE_CONTENT_VIEW_MODES,
  fileContentViewModeLabel,
  type FileContentViewMode
} from '@/lib/diff/fileViewMode'

export function FileViewModeToggle({
  viewMode,
  onViewModeChange
}: {
  viewMode: FileContentViewMode
  onViewModeChange: (mode: FileContentViewMode) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex rounded border border-gf-border-strong text-[10px]">
      {FILE_CONTENT_VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange(mode)}
          className={`px-2 py-0.5 capitalize ${
            viewMode === mode
              ? 'bg-gf-surface text-gf-fg'
              : 'text-gf-fg-muted hover:bg-gf-bg'
          }`}
        >
          {fileContentViewModeLabel(mode, t)}
        </button>
      ))}
    </div>
  )
}
