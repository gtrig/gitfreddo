import { describe, expect, it } from 'vitest'
import { parseStashListLine } from './stash'

describe('parseStashListLine', () => {
  it('parses stash list lines with branch names', () => {
    const line = 'stash@{0}\x1fabc123def456\x1fWIP on main: save work'
    expect(parseStashListLine(line, 0)).toEqual({
      index: 0,
      message: 'WIP on main: save work',
      branch: 'main',
      hash: 'abc123def456'
    })
  })

  it('handles custom stash messages without branch info', () => {
    const line = 'stash@{1}\x1fdef456abc123\x1fon login screen'
    expect(parseStashListLine(line, 1)).toEqual({
      index: 1,
      message: 'on login screen',
      branch: '',
      hash: 'def456abc123'
    })
  })

  it('returns null for blank lines', () => {
    expect(parseStashListLine('', 0)).toBeNull()
    expect(parseStashListLine('   ', 0)).toBeNull()
  })
})
