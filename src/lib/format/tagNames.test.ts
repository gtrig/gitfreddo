import { describe, expect, it } from 'vitest'
import { localTagName, tagCheckoutRef } from './tagNames'

describe('localTagName', () => {
  it('strips the remote prefix from remote tags', () => {
    expect(localTagName('origin/v1.0.0')).toBe('v1.0.0')
  })

  it('returns local tags unchanged', () => {
    expect(localTagName('v1.0.0')).toBe('v1.0.0')
  })
})

describe('tagCheckoutRef', () => {
  it('uses the local tag name for checkout', () => {
    expect(tagCheckoutRef('origin/release-2')).toBe('release-2')
  })
})
