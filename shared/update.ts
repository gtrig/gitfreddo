export type UpdateChannel = 'stable' | 'beta'

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
