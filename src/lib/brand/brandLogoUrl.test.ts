import { describe, expect, it } from 'vitest'
import { brandLogoUrl } from './brandLogoUrl'

describe('brandLogoUrl', () => {
  it('uses a relative base for packaged Electron loads', () => {
    expect(brandLogoUrl('./')).toBe('./logo.png')
  })

  it('uses an absolute base for dev server loads', () => {
    expect(brandLogoUrl('/')).toBe('/logo.png')
  })
})
