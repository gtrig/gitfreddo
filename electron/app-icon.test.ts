import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateFromPath = vi.fn()
const mockGetAppPath = vi.fn(() => '/app/path')
let packaged = false

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return packaged
    },
    getAppPath: () => mockGetAppPath()
  },
  nativeImage: {
    createFromPath: (...args: unknown[]) => mockCreateFromPath(...args)
  }
}))

import { loadAppIcon } from './app-icon'

describe('loadAppIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    packaged = false
  })

  it('returns the icon when nativeImage loads a non-empty image in development', () => {
    const image = { isEmpty: () => false }
    mockCreateFromPath.mockReturnValue(image)

    expect(loadAppIcon()).toBe(image)
    expect(mockCreateFromPath).toHaveBeenCalledWith(expect.stringContaining('assets/logo.png'))
  })

  it('returns undefined when the image file is empty', () => {
    mockCreateFromPath.mockReturnValue({ isEmpty: () => true })
    expect(loadAppIcon()).toBeUndefined()
  })

  it('uses the packaged app path when running from a bundle', () => {
    packaged = true
    mockCreateFromPath.mockReturnValue({ isEmpty: () => false })

    loadAppIcon()

    expect(mockGetAppPath).toHaveBeenCalled()
    expect(mockCreateFromPath).toHaveBeenCalledWith('/app/path/assets/logo.png')
  })
})
