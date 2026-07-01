import { useEffect, useState } from 'react'

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 }
]

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatTimeSince(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const diffMs = date.getTime() - now
  const absDiff = Math.abs(diffMs)

  for (const { unit, ms } of UNITS) {
    if (absDiff >= ms || unit === 'second') {
      return relativeTimeFormatter.format(Math.round(diffMs / ms), unit)
    }
  }

  return relativeTimeFormatter.format(0, 'second')
}

export function formatAuthoredDateTooltip(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

/** Tick every minute so relative commit ages stay fresh while the timeline is open. */
export function useRelativeNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
