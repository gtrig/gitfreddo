/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAppLogger } from './useAppLogger'
import { appLog } from '@/stores/logs'

vi.mock('@/stores/logs', () => ({
  appLog: vi.fn()
}))

describe('useAppLogger', () => {
  it('logs startup once on mount', () => {
    renderHook(() => useAppLogger())
    expect(appLog).toHaveBeenCalledWith('info', 'GitFreddo started')
    expect(appLog).toHaveBeenCalledTimes(1)
  })
})
