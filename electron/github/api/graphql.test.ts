import { describe, expect, it } from 'vitest'
import { getGitHubGraphqlUrl } from './graphql'

describe('graphql', () => {
  it('builds the github.com graphql url', () => {
    expect(getGitHubGraphqlUrl()).toBe('https://api.github.com/graphql')
  })
})
