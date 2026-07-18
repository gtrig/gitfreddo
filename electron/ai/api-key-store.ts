import { createForgeTokenStore } from '../forge/token-store'
import { AI_API_KEY_REDACTED, isAiApiKeyRedactedPlaceholder } from '../../shared/settings-secrets'

const store = createForgeTokenStore('ai-api-key.enc', 'AI API')

export { AI_API_KEY_REDACTED, isAiApiKeyRedactedPlaceholder }

export async function saveAiApiKey(key: string): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed) {
    await store.clearToken()
    return
  }
  await store.saveToken(trimmed)
}

export async function loadAiApiKey(): Promise<string | null> {
  return store.loadToken()
}

export async function clearAiApiKey(): Promise<void> {
  await store.clearToken()
}

export async function hasAiApiKey(): Promise<boolean> {
  return store.hasToken()
}
