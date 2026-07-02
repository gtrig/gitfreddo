import { describe, expect, it } from 'vitest'
import { NON_INTERACTIVE_GIT_ENV } from './commit-message'

describe('commit-message', () => {
  it('uses a no-op editor for non-interactive continue', () => {
    expect(NON_INTERACTIVE_GIT_ENV.GIT_EDITOR).toBe('true')
    expect(NON_INTERACTIVE_GIT_ENV.GIT_TERMINAL_PROMPT).toBe('0')
  })
})
