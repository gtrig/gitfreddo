import { beforeEach, describe, expect, it } from 'vitest'
import { appLog, useLogStore } from '@/stores/logs'

describe('useLogStore', () => {
  beforeEach(() => {
    useLogStore.setState({
      open: false,
      height: 220,
      activeTab: 'app',
      gitListening: false,
      gitEntries: [],
      appEntries: []
    })
  })

  it('appends and trims entries at 500', () => {
    const { append } = useLogStore.getState()
    for (let index = 0; index < 505; index += 1) {
      append({
        id: `entry-${index}`,
        stream: 'app',
        level: 'info',
        timestamp: index,
        message: `line ${index}`
      })
    }
    expect(useLogStore.getState().appEntries).toHaveLength(500)
    expect(useLogStore.getState().appEntries[0]?.message).toBe('line 5')
  })

  it('clears streams independently', () => {
    useLogStore.getState().append({
      id: 'git-1',
      stream: 'git',
      level: 'info',
      timestamp: 1,
      message: 'git'
    })
    useLogStore.getState().append({
      id: 'app-1',
      stream: 'app',
      level: 'info',
      timestamp: 1,
      message: 'app'
    })

    useLogStore.getState().clear('git')
    expect(useLogStore.getState().gitEntries).toHaveLength(0)
    expect(useLogStore.getState().appEntries).toHaveLength(1)
  })

  it('clamps drawer height', () => {
    useLogStore.getState().setHeight(50)
    expect(useLogStore.getState().height).toBe(120)
    useLogStore.getState().setHeight(999)
    expect(useLogStore.getState().height).toBe(480)
  })
})

describe('appLog', () => {
  beforeEach(() => {
    useLogStore.setState({ appEntries: [] })
  })

  it('appends app log entries', () => {
    appLog('error', 'Something failed', 'details')
    expect(useLogStore.getState().appEntries[0]?.message).toBe('Something failed')
    expect(useLogStore.getState().appEntries[0]?.details).toBe('details')
  })
})
