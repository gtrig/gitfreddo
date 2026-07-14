import { describe, expect, it, vi } from 'vitest'
import { resolveStoredOrDiscoveredSshKeyTitle } from './resolve-ssh-key-title'

describe('resolveStoredOrDiscoveredSshKeyTitle', () => {
  it('returns the trimmed stored title without discovering', async () => {
    const discover = vi.fn()
    const persist = vi.fn()

    await expect(
      resolveStoredOrDiscoveredSshKeyTitle({
        settings: { id: 1 },
        stored: '  GitFreddo stored  ',
        discover,
        persist
      })
    ).resolves.toEqual({ settings: { id: 1 }, sshKeyTitle: 'GitFreddo stored' })

    expect(discover).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })

  it('discovers, persists, and returns the discovered title when nothing is stored', async () => {
    const discover = vi.fn(async () => 'GitFreddo discovered')
    const persist = vi.fn(async () => ({ id: 2 }))

    await expect(
      resolveStoredOrDiscoveredSshKeyTitle({
        settings: { id: 1 },
        stored: '',
        discover,
        persist
      })
    ).resolves.toEqual({ settings: { id: 2 }, sshKeyTitle: 'GitFreddo discovered' })

    expect(discover).toHaveBeenCalledOnce()
    expect(persist).toHaveBeenCalledWith('GitFreddo discovered')
  })

  it('returns an empty title when discovery finds nothing', async () => {
    const discover = vi.fn(async () => null)
    const persist = vi.fn()

    await expect(
      resolveStoredOrDiscoveredSshKeyTitle({
        settings: { id: 1 },
        stored: null,
        discover,
        persist
      })
    ).resolves.toEqual({ settings: { id: 1 }, sshKeyTitle: '' })

    expect(persist).not.toHaveBeenCalled()
  })

  it('returns an empty title when discovery throws', async () => {
    const discover = vi.fn(async () => {
      throw new Error('missing scope')
    })
    const persist = vi.fn()

    await expect(
      resolveStoredOrDiscoveredSshKeyTitle({
        settings: { id: 1 },
        stored: undefined,
        discover,
        persist
      })
    ).resolves.toEqual({ settings: { id: 1 }, sshKeyTitle: '' })

    expect(persist).not.toHaveBeenCalled()
  })
})
