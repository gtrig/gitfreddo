import { describe, expect, it } from 'vitest'
import type { ForgeProvider } from '@/lib/forge/detect'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'
import {
  buildBranchUpstreams,
  buildRemoteProviders,
  remoteNameFromRefLabel,
  timelineRefLocation
} from '@/lib/timeline/timelineRefLocation'

const branch = (label: string): TimelineRef => ({
  kind: 'branch',
  label,
  fullRef: `refs/heads/${label}`,
  sourceOrder: 0
})

const remote = (label: string): TimelineRef => ({
  kind: 'remote',
  label,
  fullRef: `refs/remotes/${label}`,
  sourceOrder: 0
})

const tag = (label: string): TimelineRef => ({
  kind: 'tag',
  label,
  fullRef: `refs/tags/${label}`,
  sourceOrder: 0
})

describe('remoteNameFromRefLabel', () => {
  it('extracts the remote name from origin/main', () => {
    expect(remoteNameFromRefLabel('origin/main')).toBe('origin')
  })

  it('returns null when there is no slash', () => {
    expect(remoteNameFromRefLabel('main')).toBeNull()
  })
})

describe('buildBranchUpstreams', () => {
  it('maps local branch names to upstreams and ignores remotes', () => {
    const map = buildBranchUpstreams([
      {
        name: 'main',
        head: 'a',
        upstream: 'origin/main',
        ahead: 0,
        behind: 0,
        isCurrent: true,
        isRemote: false
      },
      {
        name: 'origin/main',
        head: 'a',
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: true
      },
      {
        name: 'feature',
        head: 'b',
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: false
      }
    ])

    expect(map.get('main')).toBe('origin/main')
    expect(map.get('feature')).toBeUndefined()
    expect(map.has('origin/main')).toBe(false)
  })
})

describe('buildRemoteProviders', () => {
  it('detects forge providers from remote URLs', () => {
    const map = buildRemoteProviders([
      { name: 'origin', url: 'https://github.com/org/repo.git', fetch: '', push: '' },
      { name: 'gitlab', url: 'https://gitlab.com/org/repo.git', fetch: '', push: '' },
      { name: 'bb', url: 'https://bitbucket.org/ws/repo.git', fetch: '', push: '' },
      { name: 'other', url: 'https://example.com/org/repo.git', fetch: '', push: '' }
    ])

    expect(map.get('origin')).toBe('github')
    expect(map.get('gitlab')).toBe('gitlab')
    expect(map.get('bb')).toBe('bitbucket')
    expect(map.get('other')).toBeNull()
  })
})

describe('timelineRefLocation', () => {
  const providers = new Map<string, ForgeProvider | null>([
    ['origin', 'github'],
    ['gitlab', 'gitlab'],
    ['bb', 'bitbucket'],
    ['other', null]
  ])

  it('shows local icon for local branches without upstream', () => {
    expect(
      timelineRefLocation(branch('feature'), {
        branchUpstreams: new Map(),
        remoteProviders: providers
      })
    ).toEqual({ showLocal: true, remoteProvider: null })
  })

  it('shows forge remote icon when local branch has a github upstream', () => {
    expect(
      timelineRefLocation(branch('main'), {
        branchUpstreams: new Map([['main', 'origin/main']]),
        remoteProviders: providers
      })
    ).toEqual({ showLocal: true, remoteProvider: 'github' })
  })

  it('shows gitlab and bitbucket providers from upstream remote name', () => {
    expect(
      timelineRefLocation(branch('a'), {
        branchUpstreams: new Map([['a', 'gitlab/a']]),
        remoteProviders: providers
      }).remoteProvider
    ).toBe('gitlab')

    expect(
      timelineRefLocation(branch('b'), {
        branchUpstreams: new Map([['b', 'bb/b']]),
        remoteProviders: providers
      }).remoteProvider
    ).toBe('bitbucket')
  })

  it('uses unknown for tracked remotes that are not a known forge', () => {
    expect(
      timelineRefLocation(branch('main'), {
        branchUpstreams: new Map([['main', 'other/main']]),
        remoteProviders: providers
      })
    ).toEqual({ showLocal: true, remoteProvider: 'unknown' })
  })

  it('shows remote icon for remote-only refs without a local icon', () => {
    expect(
      timelineRefLocation(remote('origin/feature'), {
        branchUpstreams: new Map(),
        remoteProviders: providers
      })
    ).toEqual({ showLocal: false, remoteProvider: 'github' })
  })

  it('shows no location icons for tags', () => {
    expect(
      timelineRefLocation(tag('v1.0'), {
        branchUpstreams: new Map([['v1.0', 'origin/v1.0']]),
        remoteProviders: providers
      })
    ).toEqual({ showLocal: false, remoteProvider: null })
  })
})
