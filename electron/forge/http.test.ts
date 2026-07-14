import { describe, expect, it, vi } from 'vitest'
import { readForgeJson, requireForgeToken } from './http'

describe('requireForgeToken', () => {
  it('returns a trimmed token', async () => {
    await expect(requireForgeToken(async () => '  tok  ', 'Forge')).resolves.toBe('tok')
  })

  it('throws when missing', async () => {
    await expect(requireForgeToken(async () => null, 'Forge')).rejects.toThrow(
      /Forge is not connected/
    )
  })
})

describe('readForgeJson', () => {
  it('parses JSON on success', async () => {
    const response = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 1 }),
      text: vi.fn()
    } as unknown as Response

    await expect(readForgeJson<{ id: number }>(response, 'Forge')).resolves.toEqual({ id: 1 })
  })

  it('throws with status detail on failure', async () => {
    const response = {
      ok: false,
      status: 403,
      text: vi.fn().mockResolvedValue('forbidden'),
      json: vi.fn()
    } as unknown as Response

    await expect(readForgeJson(response, 'Forge')).rejects.toThrow(
      'Forge API error (403): forbidden'
    )
  })

  it('returns undefined for 204 when allowed', async () => {
    const response = {
      ok: true,
      status: 204,
      json: vi.fn(),
      text: vi.fn()
    } as unknown as Response

    await expect(
      readForgeJson(response, 'Forge', { allowEmpty: true })
    ).resolves.toBeUndefined()
  })
})
