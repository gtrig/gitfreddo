import { describe, expect, it, vi } from 'vitest'
import { buildPushMenuItems, buildPushTargets } from './pushTargets'

const remotes = [{ name: 'upstream' }, { name: 'backup' }, { name: 'origin' }]

describe('buildPushTargets', () => {
  it('lists every remote with the default first, then by name', () => {
    expect(buildPushTargets(remotes, 'origin', 'upstream/main').map((t) => t.name)).toEqual([
      'origin',
      'backup',
      'upstream'
    ])
  })

  it('marks the default remote and the current upstream remote', () => {
    const targets = buildPushTargets(remotes, 'origin', 'upstream/main')
    expect(targets.find((t) => t.name === 'origin')).toMatchObject({ isDefault: true, isUpstream: false })
    expect(targets.find((t) => t.name === 'upstream')).toMatchObject({ isDefault: false, isUpstream: true })
    expect(targets.find((t) => t.name === 'backup')).toMatchObject({ isDefault: false, isUpstream: false })
  })

  it('handles a branch without an upstream', () => {
    expect(buildPushTargets(remotes, 'origin').every((t) => !t.isUpstream)).toBe(true)
  })
})

describe('buildPushMenuItems', () => {
  const labels = {
    pushTo: (remote: string) => `Push to ${remote}`,
    upstreamSuffix: '(upstream)',
    setAsUpstream: 'Set as upstream'
  }

  it('has one push item per remote and a set-as-upstream toggle', () => {
    const onPush = vi.fn()
    const onToggleSetUpstream = vi.fn()
    const items = buildPushMenuItems(buildPushTargets(remotes, 'origin', 'upstream/main'), {
      setUpstream: false,
      labels,
      onPush,
      onToggleSetUpstream
    })

    expect(items.filter((item) => !item.separator).map((item) => item.label)).toEqual([
      'Push to origin',
      'Push to backup',
      'Push to upstream (upstream)',
      'Set as upstream'
    ])

    items.find((item) => item.label === 'Push to backup')!.onClick()
    expect(onPush).toHaveBeenCalledWith('backup')

    const toggle = items.find((item) => item.label === 'Set as upstream')!
    expect(toggle).toMatchObject({ checked: false, keepOpen: true })
    toggle.onClick()
    expect(onToggleSetUpstream).toHaveBeenCalled()
  })

  it('shows the toggle as checked when set-as-upstream is on', () => {
    const items = buildPushMenuItems(buildPushTargets(remotes, 'origin'), {
      setUpstream: true,
      labels,
      onPush: vi.fn(),
      onToggleSetUpstream: vi.fn()
    })
    expect(items.find((item) => item.label === 'Set as upstream')?.checked).toBe(true)
  })
})
