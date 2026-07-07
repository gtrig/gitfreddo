export type UpdateChannel = 'stable' | 'beta'

export const DEFAULT_UPDATE_REPOSITORY = 'gtrig/gitfreddo'

export type UpdateErrorKind = 'repo_not_found' | 'auth' | 'network' | 'unknown'

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available'; version: string }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export type UpdateUiStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'

export interface UpdateUiState {
  status: UpdateUiStatus
  currentVersion: string
  availableVersion?: string
  releaseNotes?: string
  progressPercent?: number
  errorMessage?: string
}

export function reduceUpdateState(state: UpdateUiState, event: UpdateEvent): UpdateUiState {
  switch (event.type) {
    case 'checking':
      return { ...state, status: 'checking', errorMessage: undefined }
    case 'available':
      return {
        ...state,
        status: 'available',
        availableVersion: event.version,
        releaseNotes: event.releaseNotes,
        errorMessage: undefined
      }
    case 'not-available':
      return {
        ...state,
        status: 'up-to-date',
        availableVersion: undefined,
        releaseNotes: undefined,
        errorMessage: undefined
      }
    case 'progress':
      return {
        ...state,
        status: 'downloading',
        progressPercent: event.percent
      }
    case 'downloaded':
      return {
        ...state,
        status: 'downloaded',
        availableVersion: event.version,
        progressPercent: 100,
        errorMessage: undefined
      }
    case 'error':
      return {
        ...state,
        status: 'error',
        errorMessage: event.message
      }
    default:
      return state
  }
}

export function applyUpdateChannel(channel: UpdateChannel): {
  allowPrerelease: boolean
} {
  return { allowPrerelease: channel === 'beta' }
}

export function classifyUpdateError(message: string): UpdateErrorKind {
  const normalized = message.toLowerCase()
  if (
    normalized.includes('404') &&
    (normalized.includes('releases.atom') || normalized.includes('/releases'))
  ) {
    return 'repo_not_found'
  }
  if (normalized.includes('authentication token') || normalized.includes('401')) {
    return 'auth'
  }
  if (
    normalized.includes('enotfound') ||
    normalized.includes('etimedout') ||
    normalized.includes('network') ||
    normalized.includes('econnrefused')
  ) {
    return 'network'
  }
  return 'unknown'
}

export function sanitizeUpdateErrorMessage(message: string): string {
  const statusMatch = message.match(/\b(404|401|403|500)\b/)
  const urlMatch = message.match(/url:\s*(https?:\/\/[^\s\\n]+)/i)
  const summary = [statusMatch?.[1], urlMatch?.[1]].filter(Boolean).join(' — ')
  if (summary) return summary
  const firstLine = message.split('\n').find((line) => line.trim())?.trim()
  if (!firstLine) return message
  return firstLine.length > 240 ? `${firstLine.slice(0, 237)}…` : firstLine
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function formatReleaseNotesForDisplay(notes: unknown): string | undefined {
  if (!notes) return undefined

  if (typeof notes === 'string') {
    const plain = stripHtml(notes)
    return plain || undefined
  }

  if (!Array.isArray(notes)) return undefined

  const parts = notes
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object' && 'note' in entry) {
        return (entry as { note?: string | null }).note ?? ''
      }
      return ''
    })
    .filter(Boolean)
    .map(stripHtml)
    .filter(Boolean)

  if (!parts.length) return undefined
  return parts.join('\n\n')
}
