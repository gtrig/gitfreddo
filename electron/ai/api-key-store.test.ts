import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  saveToken: vi.fn(),
  loadToken: vi.fn(),
  clearToken: vi.fn(),
  hasToken: vi.fn()
}))

vi.mock('../forge/token-store', () => ({
  createForgeTokenStore: () => ({
    saveToken: mocks.saveToken,
    loadToken: mocks.loadToken,
    clearToken: mocks.clearToken,
    hasToken: mocks.hasToken
  })
}))

import {
  AI_API_KEY_REDACTED,
  clearAiApiKey,
  hasAiApiKey,
  isAiApiKeyRedactedPlaceholder,
  loadAiApiKey,
  saveAiApiKey
} from './api-key-store'

describe('ai api-key-store', () => {
  beforeEach(() => {
    mocks.saveToken.mockReset()
    mocks.loadToken.mockReset()
    mocks.clearToken.mockReset()
    mocks.hasToken.mockReset()
  })

  it('saves trimmed keys and clears when empty', async () => {
    await saveAiApiKey('  sk-test  ')
    expect(mocks.saveToken).toHaveBeenCalledWith('sk-test')
    await saveAiApiKey('   ')
    expect(mocks.clearToken).toHaveBeenCalled()
  })

  it('loads and reports presence', async () => {
    mocks.loadToken.mockResolvedValue('sk')
    mocks.hasToken.mockResolvedValue(true)
    await expect(loadAiApiKey()).resolves.toBe('sk')
    await expect(hasAiApiKey()).resolves.toBe(true)
    await clearAiApiKey()
    expect(mocks.clearToken).toHaveBeenCalled()
  })

  it('re-exports the redacted placeholder helpers', () => {
    expect(isAiApiKeyRedactedPlaceholder(AI_API_KEY_REDACTED)).toBe(true)
    expect(isAiApiKeyRedactedPlaceholder('sk-real')).toBe(false)
  })
})
