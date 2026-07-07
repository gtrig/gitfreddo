import { describe, expect, it } from 'vitest'
import { detachedRefCheckoutParams, localBranchCheckoutParams } from '@/lib/git/branchCheckout'

describe('branchCheckout params', () => {
  it('maps local branch checkout without detach', () => {
    expect(localBranchCheckoutParams('feature/login')).toEqual({ name: 'feature/login' })
  })

  it('maps detached checkout for commits and tags', () => {
    expect(detachedRefCheckoutParams('abc123def')).toEqual({ name: 'abc123def', detach: true })
    expect(detachedRefCheckoutParams('v1.0.0')).toEqual({ name: 'v1.0.0', detach: true })
  })
})
