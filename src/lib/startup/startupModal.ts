export const STARTUP_MODAL_HIDE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface StartupModalSnooze {
  hiddenUntil: number | null
  hiddenForVersion: string | null
}

export function isStartupModalSuppressed(
  hiddenUntil: number | null | undefined,
  now = Date.now()
): boolean {
  return typeof hiddenUntil === 'number' && hiddenUntil > now
}

export function hideStartupModalUntil(days = STARTUP_MODAL_HIDE_DAYS, now = Date.now()): number {
  return now + days * MS_PER_DAY
}

export function shouldAutoShowStartupModal(
  snooze: StartupModalSnooze,
  currentVersion: string,
  now = Date.now()
): boolean {
  if (snooze.hiddenUntil == null && !snooze.hiddenForVersion) {
    return true
  }

  if (snooze.hiddenForVersion && currentVersion !== snooze.hiddenForVersion) {
    return true
  }

  return !isStartupModalSuppressed(snooze.hiddenUntil, now)
}
