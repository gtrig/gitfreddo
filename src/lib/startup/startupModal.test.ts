import { describe, expect, it } from 'vitest'
import {
  STARTUP_MODAL_HIDE_DAYS,
  hideStartupModalUntil,
  isStartupModalSuppressed,
  shouldAutoShowStartupModal
} from './startupModal'

describe('startup modal visibility', () => {
  const now = Date.parse('2026-07-11T00:00:00.000Z')

  it('is not suppressed when hidden-until is null', () => {
    expect(isStartupModalSuppressed(null, now)).toBe(false)
  })

  it('is suppressed while hidden-until is in the future', () => {
    expect(isStartupModalSuppressed(now + 1_000, now)).toBe(true)
  })

  it('is not suppressed after hidden-until expires', () => {
    expect(isStartupModalSuppressed(now - 1, now)).toBe(false)
  })

  it('computes a 30-day hide timestamp by default', () => {
    const hiddenUntil = hideStartupModalUntil(STARTUP_MODAL_HIDE_DAYS, now)
    expect(hiddenUntil - now).toBe(30 * 24 * 60 * 60 * 1000)
  })
})

describe('shouldAutoShowStartupModal', () => {
  const now = Date.parse('2026-07-11T00:00:00.000Z')

  it('shows when the modal has never been snoozed', () => {
    expect(
      shouldAutoShowStartupModal(
        { hiddenUntil: null, hiddenForVersion: null },
        '0.3.0',
        now
      )
    ).toBe(true)
  })

  it('hides while snoozed for the same version within 30 days', () => {
    expect(
      shouldAutoShowStartupModal(
        { hiddenUntil: now + 1_000, hiddenForVersion: '0.3.0' },
        '0.3.0',
        now
      )
    ).toBe(false)
  })

  it('shows again after the app version changes', () => {
    expect(
      shouldAutoShowStartupModal(
        { hiddenUntil: now + 1_000, hiddenForVersion: '0.3.0' },
        '0.3.1',
        now
      )
    ).toBe(true)
  })

  it('shows again after the 30-day snooze expires', () => {
    expect(
      shouldAutoShowStartupModal(
        { hiddenUntil: now - 1, hiddenForVersion: '0.3.0' },
        '0.3.0',
        now
      )
    ).toBe(true)
  })
})
