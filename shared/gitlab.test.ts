import { describe, expect, it } from 'vitest'
import {
  encodeGitlabProjectPath,
  getDefaultGitlabHost,
  gitlabMergeMethodToApi,
  isGitlabHost,
  normalizeGitlabIssueState,
  normalizeGitlabMrState,
  parseGitlabRemote,
  slugifyIssueBranch
} from './gitlab'

describe('getDefaultGitlabHost', () => {
  it('returns gitlab.com', () => {
    expect(getDefaultGitlabHost()).toBe('gitlab.com')
  })
})

describe('isGitlabHost', () => {
  it('matches gitlab.com', () => {
    expect(isGitlabHost('gitlab.com')).toBe(true)
    expect(isGitlabHost('https://gitlab.com')).toBe(true)
    expect(isGitlabHost('group.gitlab.com')).toBe(true)
  })

  it('matches self-managed host when configured', () => {
    expect(isGitlabHost('gitlab.mycompany.com', 'gitlab.mycompany.com')).toBe(true)
    expect(isGitlabHost('gitlab.mycompany.com')).toBe(false)
  })

  it('rejects non-gitlab hosts', () => {
    expect(isGitlabHost('github.com')).toBe(false)
  })
})

describe('parseGitlabRemote', () => {
  it('parses https gitlab urls', () => {
    expect(parseGitlabRemote('https://gitlab.com/group/repo.git')).toEqual({
      host: 'gitlab.com',
      namespace: 'group',
      owner: 'group',
      repo: 'repo'
    })
  })

  it('parses ssh gitlab urls', () => {
    expect(parseGitlabRemote('git@gitlab.com:group/repo.git')).toEqual({
      host: 'gitlab.com',
      namespace: 'group',
      owner: 'group',
      repo: 'repo'
    })
  })

  it('parses self-managed gitlab urls when host is configured', () => {
    expect(
      parseGitlabRemote('https://gitlab.mycompany.com/team/repo.git', 'gitlab.mycompany.com')
    ).toEqual({
      host: 'gitlab.mycompany.com',
      namespace: 'team',
      owner: 'team',
      repo: 'repo'
    })
  })

  it('returns null for non-gitlab urls', () => {
    expect(parseGitlabRemote('https://github.com/org/repo.git')).toBeNull()
    expect(parseGitlabRemote('')).toBeNull()
    expect(parseGitlabRemote('not-a-url')).toBeNull()
  })
})

describe('slugifyIssueBranch', () => {
  it('slugifies issue titles', () => {
    expect(slugifyIssueBranch('Fix: Login Bug!')).toBe('fix-login-bug')
  })
})

describe('gitlabMergeMethodToApi', () => {
  it('maps merge methods to GitLab API params', () => {
    expect(gitlabMergeMethodToApi('merge')).toEqual({ squash: false })
    expect(gitlabMergeMethodToApi('squash')).toEqual({ squash: true })
    expect(gitlabMergeMethodToApi('rebase')).toEqual({ squash: false })
  })
})

describe('normalizeGitlabMrState', () => {
  it('normalizes MR states', () => {
    expect(normalizeGitlabMrState('opened')).toBe('open')
    expect(normalizeGitlabMrState('merged')).toBe('closed')
    expect(normalizeGitlabMrState('locked')).toBe('closed')
    expect(normalizeGitlabMrState('custom')).toBe('custom')
  })
})

describe('normalizeGitlabIssueState', () => {
  it('normalizes issue states', () => {
    expect(normalizeGitlabIssueState('opened')).toBe('open')
    expect(normalizeGitlabIssueState('closed')).toBe('closed')
  })
})

describe('encodeGitlabProjectPath', () => {
  it('encodes namespace/repo for API paths', () => {
    expect(encodeGitlabProjectPath('group', 'repo')).toBe('group%2Frepo')
  })
})
