import type { AppSettings } from '@/hooks/useAppSettings'

export const FILE_CONTENT_VIEW_MODES = ['unified', 'split', 'full'] as const
export type FileContentViewMode = (typeof FILE_CONTENT_VIEW_MODES)[number]

export function defaultFileContentViewMode(
  preference?: AppSettings['diffViewMode']
): 'unified' | 'split' {
  return preference === 'split' ? 'split' : 'unified'
}

export function fileContentViewModeLabel(
  mode: FileContentViewMode,
  t: (key: string) => string
): string {
  if (mode === 'split') return t('diff.sideBySide')
  if (mode === 'full') return t('diff.fullFile')
  return mode
}
