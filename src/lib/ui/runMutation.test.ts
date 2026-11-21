import { describe, expect, it, vi } from 'vitest'
import { runMutation } from './runMutation'

describe('runMutation', () => {
  it('resolves with the mutation result and reports nothing on success', async () => {
    const report = vi.fn()
    await expect(runMutation(Promise.resolve(42), report)).resolves.toBe(42)
    expect(report).not.toHaveBeenCalled()
  })

  it('reports the error message instead of leaving an unhandled rejection', async () => {
    const report = vi.fn()
    await expect(
      runMutation(Promise.reject(new Error('index.lock exists')), report)
    ).resolves.toBeUndefined()
    expect(report).toHaveBeenCalledWith('index.lock exists', 'error')
  })

  it('reports non-Error rejections as text', async () => {
    const report = vi.fn()
    await runMutation(Promise.reject('boom'), report)
    expect(report).toHaveBeenCalledWith('boom', 'error')
  })
})
