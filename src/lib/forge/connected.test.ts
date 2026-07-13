import { describe, expect, it } from 'vitest'
import { getConnectedForges } from './connected'

describe('getConnectedForges', () => {
  it('returns empty list when no integrations are connected', () => {
    expect(getConnectedForges({})).toEqual([])
    expect(
      getConnectedForges({
        github: { connected: false },
        bitbucket: { connected: false },
        gitlab: { connected: false }
      })
    ).toEqual([])
  })

  it('returns connected integrations in stable order', () => {
    expect(
      getConnectedForges({
        gitlab: { connected: true },
        github: { connected: true },
        bitbucket: { connected: true }
      })
    ).toEqual(['github', 'bitbucket', 'gitlab'])
  })

  it('omits disconnected integrations', () => {
    expect(
      getConnectedForges({
        github: { connected: false },
        bitbucket: { connected: true },
        gitlab: { connected: true }
      })
    ).toEqual(['bitbucket', 'gitlab'])
  })
})
