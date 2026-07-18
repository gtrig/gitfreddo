import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '../../shared/ipc'
import { aiConfigFromSettings, aiFill } from './client'

describe('aiConfigFromSettings', () => {
  it('maps app settings into the AI client config', () => {
    const settings = {
      aiProvider: 'api',
      aiBaseUrl: 'https://api.example.com/v1',
      aiApiKey: 'secret',
      aiModel: 'gpt-test',
      aiSystemInstructions: 'system',
      aiCommitInstructions: 'commit',
      aiStashInstructions: 'stash',
      aiConflictInstructions: 'conflict',
      aiAnalyzeInstructions: 'analyze'
    } as AppSettings

    expect(aiConfigFromSettings(settings)).toEqual({
      provider: 'api',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'secret',
      model: 'gpt-test',
      instructions: {
        system: 'system',
        commitMessage: 'commit',
        stashMessage: 'stash',
        conflictResolve: 'conflict',
        analyze: 'analyze'
      }
    })
  })
})

describe('aiFill', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const baseConfig = {
    provider: 'local' as const,
    baseUrl: 'http://localhost:1234/v1/',
    apiKey: '',
    model: 'local-model',
    instructions: {
      system: '',
      commitMessage: '',
      stashMessage: '',
      conflictResolve: '',
      analyze: ''
    }
  }

  it('requires a configured base URL', async () => {
    await expect(
      aiFill({ ...baseConfig, baseUrl: '' }, { purpose: 'commit_message', context: {} })
    ).rejects.toThrow(/base URL is not configured/i)
  })

  it('requires an API key for cloud provider', async () => {
    await expect(
      aiFill(
        { ...baseConfig, provider: 'api', apiKey: '   ' },
        { purpose: 'commit_message', context: {} }
      )
    ).rejects.toThrow(/API key is required/i)
  })

  it('returns stripped model content from chat completions', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'local-model' }] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '```\nfeat: add tests\n```' }, finish_reason: 'stop' }]
          }),
          { status: 200 }
        )
      )

    await expect(
      aiFill(
        { ...baseConfig, model: '' },
        { purpose: 'commit_message', context: { currentText: 'wip' } }
      )
    ).resolves.toBe('feat: add tests')

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:1234/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"local-model"')
      })
    )
  })

  it('throws when the chat completion response is empty', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'local-model' }] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '   ' }, finish_reason: 'length' }]
          }),
          { status: 200 }
        )
      )

    await expect(
      aiFill(baseConfig, { purpose: 'commit_message', context: { currentText: 'wip' } })
    ).rejects.toThrow(/empty response/i)
  })

  it('includes API error details when chat completion fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('model unavailable', { status: 503 }))

    await expect(
      aiFill(baseConfig, { purpose: 'commit_message', context: { currentText: 'wip' } })
    ).rejects.toThrow(/AI request failed \(503\): model unavailable/)
  })
})
