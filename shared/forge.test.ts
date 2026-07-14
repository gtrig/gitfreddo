import { describe, expect, it } from 'vitest'
import { slugifyIssueBranch } from './forge'

describe('slugifyIssueBranch', () => {
  it('slugifies issue titles', () => {
    expect(slugifyIssueBranch('Fix: Login Bug!')).toBe('fix-login-bug')
  })

  it('collapses punctuation and trims dashes', () => {
    expect(slugifyIssueBranch('---Hello---World!!!---')).toBe('hello-world')
  })

  it('truncates to 40 characters', () => {
    const long = 'a'.repeat(50)
    expect(slugifyIssueBranch(long)).toHaveLength(40)
  })
})
