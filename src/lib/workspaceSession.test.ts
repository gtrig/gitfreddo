import { describe, expect, it } from 'vitest'
import { orderPathsForRestore, workspaceSessionKey } from './workspaceSession'

describe('workspaceSessionKey', () => {
  it('changes when tab order changes', () => {
    const a = workspaceSessionKey({ tabPaths: ['/a', '/b'], activePath: '/a' })
    const b = workspaceSessionKey({ tabPaths: ['/b', '/a'], activePath: '/a' })
    expect(a).not.toBe(b)
  })
})

describe('orderPathsForRestore', () => {
  it('connects active tab last', () => {
    const { connectOrder, activePath } = orderPathsForRestore(['/a', '/b', '/c'], '/b')
    expect(activePath).toBe('/b')
    expect(connectOrder).toEqual(['/a', '/c', '/b'])
  })

  it('falls back to first tab when active is missing', () => {
    const { connectOrder, activePath } = orderPathsForRestore(['/a', '/b'], null)
    expect(activePath).toBe('/a')
    expect(connectOrder).toEqual(['/b', '/a'])
  })
})
