import { describe, expect, it } from 'vitest'
import { parseGitHubRemote, slugifyIssueBranch } from './github'

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

describe('slugifyIssueBranch', () => {
  it('slugifies issue titles', () => {
    expect(slugifyIssueBranch('Fix: Login Bug!')).toBe('fix-login-bug')
  })
})
