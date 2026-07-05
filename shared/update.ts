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
