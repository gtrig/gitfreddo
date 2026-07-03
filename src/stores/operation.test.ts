import { beforeEach, describe, expect, it } from 'vitest'
import { runGlobalOperation, useOperationStore } from '@/stores/operation'

describe('useOperationStore', () => {
  beforeEach(() => {
    useOperationStore.setState({ count: 0, message: null })
  })

  it('tracks nested operations', () => {
    const { begin, end } = useOperationStore.getState()
    begin('Working')
    begin()
    expect(useOperationStore.getState().count).toBe(2)
    expect(useOperationStore.getState().message).toBe('Working')

    end()
    expect(useOperationStore.getState().count).toBe(1)
    expect(useOperationStore.getState().message).toBe('Working')

    end()
    expect(useOperationStore.getState().count).toBe(0)
    expect(useOperationStore.getState().message).toBeNull()
  })
})

describe('runGlobalOperation', () => {
  beforeEach(() => {
    useOperationStore.setState({ count: 0, message: null })
  })

  it('always ends the operation even when the task throws', async () => {
    await expect(
      runGlobalOperation(async () => {
        throw new Error('boom')
      }, 'Saving')
    ).rejects.toThrow('boom')

    expect(useOperationStore.getState().count).toBe(0)
  })

  it('returns the task result', async () => {
    const value = await runGlobalOperation(async () => 42, 'Loading')
    expect(value).toBe(42)
    expect(useOperationStore.getState().count).toBe(0)
  })
})
