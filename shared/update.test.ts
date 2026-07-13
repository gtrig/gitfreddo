import { describe, expect, it } from 'vitest'
import {
  applyUpdateChannel,
  classifyUpdateError,
  formatReleaseNotesForDisplay,
  reduceUpdateState,
  sanitizeUpdateErrorMessage
} from './update'

describe('reduceUpdateState', () => {
  const base = { status: 'idle' as const, currentVersion: '0.2.8' }

  it('tracks available update', () => {
    const next = reduceUpdateState(base, { type: 'available', version: '0.3.0' })
    expect(next.status).toBe('available')
    expect(next.availableVersion).toBe('0.3.0')
  })

  it('tracks download progress and completion', () => {
    let state = reduceUpdateState(base, { type: 'available', version: '0.3.0' })
    state = reduceUpdateState(state, { type: 'progress', percent: 42 })
    expect(state.status).toBe('downloading')
    expect(state.progressPercent).toBe(42)
    state = reduceUpdateState(state, { type: 'downloaded', version: '0.3.0' })
    expect(state.status).toBe('downloaded')
  })

  it('maps errors', () => {
    const next = reduceUpdateState(base, { type: 'error', message: 'network' })
    expect(next.status).toBe('error')
    expect(next.errorMessage).toBe('network')
  })

  it('tracks checking and up-to-date states', () => {
    expect(reduceUpdateState(base, { type: 'checking' }).status).toBe('checking')
    const upToDate = reduceUpdateState(
      { ...base, status: 'available', availableVersion: '0.3.0', releaseNotes: 'notes' },
      { type: 'not-available', version: '0.2.8' }
    )
    expect(upToDate.status).toBe('up-to-date')
    expect(upToDate.availableVersion).toBeUndefined()
    expect(upToDate.releaseNotes).toBeUndefined()
  })
})

describe('applyUpdateChannel', () => {
  it('enables prerelease only for beta', () => {
    expect(applyUpdateChannel('stable').allowPrerelease).toBe(false)
    expect(applyUpdateChannel('beta').allowPrerelease).toBe(true)
  })
})

describe('classifyUpdateError', () => {
  it('detects missing GitHub release feeds', () => {
    const message =
      '404 "method: GET url: https://github.com/gtrig/gitfreddo/releases.atom\\n\\nPlease double check that your authentication token is correct."'
    expect(classifyUpdateError(message)).toBe('repo_not_found')
  })

  it('detects auth failures', () => {
    expect(classifyUpdateError('401 authentication token is invalid')).toBe('auth')
  })

  it('detects network failures', () => {
    expect(classifyUpdateError('getaddrinfo ENOTFOUND github.com')).toBe('network')
    expect(classifyUpdateError('connect ECONNREFUSED')).toBe('network')
    expect(classifyUpdateError('request ETIMEDOUT')).toBe('network')
  })

  it('falls back to unknown errors', () => {
    expect(classifyUpdateError('something unexpected happened')).toBe('unknown')
  })
})

describe('formatReleaseNotesForDisplay', () => {
  it('strips GitHub release HTML to readable plain text', () => {
    const html = `<h2>What's Changed</h2>
<ul>
<li>refactor: centralize git command execution by <a class="user-mention" href="https://github.com/gtrig">@gtrig</a> in <a href="https://github.com/gtrig/gitfreddo/pull/12">#12</a></li>
<li>fix: update banner styling</li>
</ul>`
    expect(formatReleaseNotesForDisplay(html)).toBe(
      "What's Changed\n• refactor: centralize git command execution by @gtrig in #12\n• fix: update banner styling"
    )
  })

  it('joins electron-updater release note entries', () => {
    expect(
      formatReleaseNotesForDisplay([
        { note: '<p>First <strong>change</strong></p>' },
        { note: 'Second change' }
      ])
    ).toBe('First change\n\nSecond change')
  })

  it('returns undefined for empty input', () => {
    expect(formatReleaseNotesForDisplay(undefined)).toBeUndefined()
    expect(formatReleaseNotesForDisplay('')).toBeUndefined()
    expect(formatReleaseNotesForDisplay([])).toBeUndefined()
    expect(formatReleaseNotesForDisplay({})).toBeUndefined()
  })

  it('formats plain string entries inside release note arrays', () => {
    expect(formatReleaseNotesForDisplay(['<p>Plain <em>note</em></p>', ''])).toBe('Plain note')
  })
})

describe('sanitizeUpdateErrorMessage', () => {
  it('strips verbose updater response details', () => {
    const message =
      '404 "method: GET url: https://github.com/gtrig/gitfreddo/releases.atom\\n\\nPlease double check..." Headers: { "cache-control": "no-cache" }'
    expect(sanitizeUpdateErrorMessage(message)).toBe(
      '404 — https://github.com/gtrig/gitfreddo/releases.atom'
    )
  })

  it('truncates long first-line messages without status or url', () => {
    const longLine = 'x'.repeat(250)
    const sanitized = sanitizeUpdateErrorMessage(longLine)
    expect(sanitized.length).toBeLessThan(longLine.length)
    expect(sanitized.endsWith('…')).toBe(true)
  })
})
