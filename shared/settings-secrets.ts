import type { AppSettings } from '../shared/ipc'

/** Placeholder returned to the renderer when an AI API key is stored securely. */
export const AI_API_KEY_REDACTED = '••••••••'

export function isAiApiKeyRedactedPlaceholder(value: string | undefined): boolean {
  return value === AI_API_KEY_REDACTED
}

/** Strip the real AI API key before sending settings to the renderer. */
export function settingsForRenderer(settings: AppSettings): AppSettings {
  return {
    ...settings,
    aiApiKey: settings.aiApiKey.trim() ? AI_API_KEY_REDACTED : ''
  }
}

/**
 * Prepare a settings patch so redacted placeholders do not clear the real key,
 * and empty strings clear it.
 */
export function normalizeAiApiKeyPatch(
  _current: AppSettings,
  patch: Partial<AppSettings>
): Partial<AppSettings> {
  if (!('aiApiKey' in patch)) {
    return patch
  }
  if (isAiApiKeyRedactedPlaceholder(patch.aiApiKey)) {
    const { aiApiKey: _ignored, ...rest } = patch
    return rest
  }
  return patch
}

/** Settings JSON on disk must never contain the plaintext AI API key. */
export function settingsForDisk(settings: AppSettings): AppSettings {
  return {
    ...settings,
    aiApiKey: ''
  }
}
