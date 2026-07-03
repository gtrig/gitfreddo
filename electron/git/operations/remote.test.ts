import { describe, expect, it } from 'vitest'
import { remoteNameFromUpstream, parseRemoteVerboseOutput } from './remote'

describe('remoteNameFromUpstream', () => {
  it('extracts the remote name from an upstream ref', () => {
    expect(remoteNameFromUpstream('origin/main')).toBe('origin')
    expect(remoteNameFromUpstream('upstream')).toBe('upstream')
  })
})

describe('parseRemoteVerboseOutput', () => {
  it('merges fetch and push urls for the same remote', () => {
    const stdout = [
      'origin\thttps://github.com/org/repo.git (fetch)',
      'origin\thttps://github.com/org/repo.git (push)',
      'upstream\thttps://github.com/org/fork.git (fetch)',
      'upstream\thttps://github.com/org/fork.git (push)'
    ].join('\n')

    expect(parseRemoteVerboseOutput(stdout)).toEqual([
      {
        name: 'origin',
        url: 'https://github.com/org/repo.git',
        fetch: 'https://github.com/org/repo.git',
        push: 'https://github.com/org/repo.git'
      },
      {
        name: 'upstream',
        url: 'https://github.com/org/fork.git',
        fetch: 'https://github.com/org/fork.git',
        push: 'https://github.com/org/fork.git'
      }
    ])
  })

  it('returns an empty array for blank output', () => {
    expect(parseRemoteVerboseOutput('')).toEqual([])
  })
})
