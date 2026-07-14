import { describe, expect, it } from 'vitest'
import { parseGitHubRemote, parseGitHubPullHtmlUrl } from './github'

describe('parseGitHubRemote', () => {
  it('parses https github urls', () => {
    expect(parseGitHubRemote('https://github.com/org/repo.git')).toEqual({
      host: 'github.com',
      owner: 'org',
      repo: 'repo'
    })
  })

  it('parses ssh github urls', () => {
    expect(parseGitHubRemote('git@github.com:org/repo.git')).toEqual({
      host: 'github.com',
      owner: 'org',
      repo: 'repo'
    })
  })

  it('returns null for non-github urls', () => {
    expect(parseGitHubRemote('https://gitlab.com/org/repo.git')).toBeNull()
  })

  it('parses GitHub Enterprise hosts', () => {
    expect(parseGitHubRemote('https://github.mycompany.com/team/repo.git')).toEqual({
      host: 'github.mycompany.com',
      owner: 'team',
      repo: 'repo'
    })
  })
})

describe('parseGitHubPullHtmlUrl', () => {
  it('parses owner and repo from a pull request url', () => {
    expect(parseGitHubPullHtmlUrl('https://github.com/ArctosWebLabs/GitFreddo/pull/42')).toEqual({
      owner: 'ArctosWebLabs',
      repo: 'GitFreddo'
    })
  })
})
