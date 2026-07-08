import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../settings', () => ({
  saveSettings: vi.fn(async (patch) => patch)
}))

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

vi.mock('./token-store', () => ({
  hasBitbucketToken: vi.fn(),
  loadBitbucketToken: vi.fn(),
  saveBitbucketToken: vi.fn(),
  clearBitbucketToken: vi.fn()
}))

vi.mock('./api/repos', () => ({
  clearRepoCache: vi.fn()
}))

vi.mock('./ssh-keys', () => ({
  generateAndUploadSshKey: vi.fn(async () => ({
    title: 'GitFreddo key',
    publicKey: 'ssh-rsa AAA...'
  })),
  findGitFreddoSshKeyTitle: vi.fn(async () => null)
}))

import type { AppSettings } from '../../shared/ipc'
import { getAuthenticatedUser } from './client'
import {
  getBitbucketStatus,
  connectBitbucketAppPassword,
  uploadBitbucketSshKey
} from './service'
import {
  clearBitbucketToken,
  hasBitbucketToken,
  loadBitbucketToken,
  saveBitbucketToken
} from './token-store'
import { saveSettings } from '../settings'
import { generateAndUploadSshKey } from './ssh-keys'

describe('bitbucket service auth', () => {
  beforeEach(() => {
    vi.mocked(hasBitbucketToken).mockResolvedValue(true)
    vi.mocked(loadBitbucketToken).mockResolvedValue('app-password-token')
    vi.mocked(saveBitbucketToken).mockResolvedValue(undefined)
    vi.mocked(clearBitbucketToken).mockResolvedValue(undefined)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: 'gtrig',
      avatar_url: 'https://avatar.example/gtrig'
    })
    vi.mocked(saveSettings).mockImplementation(async (patch) =>
      ({
        bitbucketLogin: '',
        bitbucketAuthLogin: '',
        bitbucketConnectedAt: null,
        bitbucketAuthType: null,
        bitbucketSshKeyTitle: '',
        ...patch
      }) as AppSettings
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('stores API username and auth login separately for app password connections', async () => {
    const result = await connectBitbucketAppPassword('user@example.com', 'secret')

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: 'user@example.com',
        bitbucketAuthType: 'app_password'
      })
    )
    expect(result.status).toEqual({
      connected: true,
      login: 'gtrig',
      avatarUrl: 'https://avatar.example/gtrig',
      authType: 'app_password',
      sshKeyTitle: null
    })
  })

  it('authenticates app password status checks with the auth login', async () => {
    const settings = {
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: 'user@example.com',
      bitbucketConnectedAt: Date.now(),
      bitbucketAuthType: 'app_password' as const
    }

    const { status } = await getBitbucketStatus(settings as never)

    expect(getAuthenticatedUser).toHaveBeenCalledWith(
      'app-password-token',
      'app_password',
      'user@example.com'
    )
    expect(saveSettings).not.toHaveBeenCalled()
    expect(status.connected).toBe(true)
    expect(status.login).toBe('gtrig')
  })

  it('migrates legacy app password settings that stored email in bitbucketLogin', async () => {
    const settings = {
      bitbucketLogin: 'user@example.com',
      bitbucketAuthLogin: '',
      bitbucketConnectedAt: Date.now(),
      bitbucketAuthType: 'app_password' as const
    }

    const { status } = await getBitbucketStatus(settings as never)

    expect(getAuthenticatedUser).toHaveBeenCalledWith(
      'app-password-token',
      'app_password',
      'user@example.com'
    )
    expect(saveSettings).toHaveBeenCalledWith({
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: 'user@example.com',
      bitbucketConnectedAt: settings.bitbucketConnectedAt,
      bitbucketAuthType: 'app_password'
    })
    expect(status.login).toBe('gtrig')
  })

  it('restores missing app password auth type on status checks', async () => {
    const settings = {
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: 'user@example.com',
      bitbucketConnectedAt: Date.now(),
      bitbucketAuthType: null
    }

    const { status, settings: nextSettings } = await getBitbucketStatus(settings as never)

    expect(getAuthenticatedUser).toHaveBeenCalledWith(
      'app-password-token',
      'app_password',
      'user@example.com'
    )
    expect(saveSettings).toHaveBeenCalledWith({
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: 'user@example.com',
      bitbucketConnectedAt: settings.bitbucketConnectedAt,
      bitbucketAuthType: 'app_password'
    })
    expect(status.connected).toBe(true)
    expect(nextSettings.bitbucketAuthType).toBe('app_password')
  })

  it('uploads ssh keys using the Bitbucket username slug', async () => {
    const settings = {
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: 'user@example.com',
      bitbucketAuthType: 'app_password' as const
    }

    await uploadBitbucketSshKey(settings as never, 'GitFreddo key')

    expect(saveSettings).toHaveBeenCalledWith({ bitbucketSshKeyTitle: 'GitFreddo key' })
    expect(generateAndUploadSshKey).toHaveBeenCalledWith(
      'gtrig',
      'GitFreddo key',
      {
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: 'user@example.com',
        bitbucketAuthType: 'app_password'
      }
    )
  })
})
