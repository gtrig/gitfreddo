import { describe, expect, it } from 'vitest'
import { emitLog, onLog } from './log-bus'

describe('log-bus', () => {
  it('notifies subscribers and supports unsubscribe', () => {
    const entries: string[] = []
    const unsubscribe = onLog((entry) => {
      entries.push(`${entry.stream}:${entry.level}:${entry.message}`)
    })

    emitLog('git', 'info', 'hello', 'details')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toBe('git:info:hello')

    unsubscribe()
    emitLog('app', 'warn', 'after unsubscribe')
    expect(entries).toHaveLength(1)
  })

  it('assigns unique ids and optional details', () => {
    const captured: Array<{ id: string; details?: string }> = []
    const unsubscribe = onLog((entry) => {
      captured.push({ id: entry.id, details: entry.details })
    })

    emitLog('operation', 'debug', 'step one')
    emitLog('operation', 'debug', 'step two', 'extra')

    expect(captured[0]?.id).not.toBe(captured[1]?.id)
    expect(captured[1]?.details).toBe('extra')

    unsubscribe()
  })
})
