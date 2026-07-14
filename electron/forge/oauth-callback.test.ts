import { describe, expect, it } from 'vitest'
import { getOAuthRedirectUri, parseOAuthCallbackQuery } from './oauth-callback'

describe('oauth-callback helpers', () => {
  it('builds the localhost redirect URI', () => {
    expect(getOAuthRedirectUri(8765)).toBe('http://127.0.0.1:8765/callback')
  })

  it('parses query params from a callback URL', () => {
    const params = parseOAuthCallbackQuery('/callback?code=abc&state=xyz')
    expect(params.get('code')).toBe('abc')
    expect(params.get('state')).toBe('xyz')
  })

  it('returns empty params when there is no query string', () => {
    expect(parseOAuthCallbackQuery('/callback').toString()).toBe('')
  })
})
