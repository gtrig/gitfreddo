import { describe, expect, it } from 'vitest'
import { unquoteGitPath } from './quotePath'

describe('unquoteGitPath', () => {
  it('leaves unquoted paths unchanged', () => {
    expect(unquoteGitPath('resources/views/show.blade.php')).toBe(
      'resources/views/show.blade.php'
    )
    expect(unquoteGitPath('docs/my file.md')).toBe('docs/my file.md')
  })

  it('strips C-quotes around an ASCII path', () => {
    expect(unquoteGitPath('"resources/views/show.blade.php"')).toBe(
      'resources/views/show.blade.php'
    )
  })

  it('decodes octal UTF-8 bytes used for non-ASCII names', () => {
    expect(
      unquoteGitPath('"resources/views/pages/reviews/\\342\\232\\241dashboard.blade.php"')
    ).toBe('resources/views/pages/reviews/⚡dashboard.blade.php')
  })

  it('unescapes quotes, backslashes, and control characters', () => {
    expect(unquoteGitPath('"foo\\"bar"')).toBe('foo"bar')
    expect(unquoteGitPath('"foo\\\\bar"')).toBe('foo\\bar')
    expect(unquoteGitPath('"foo\\nbar"')).toBe('foo\nbar')
    expect(unquoteGitPath('"foo\\tbar"')).toBe('foo\tbar')
  })

  it('leaves a malformed quoted string unchanged', () => {
    expect(unquoteGitPath('"unterminated')).toBe('"unterminated')
  })

  it('decodes short octal escapes and remaining simple escapes', () => {
    expect(unquoteGitPath('"\\7\\12\\141"')).toBe('\u0007\n' + 'a')
    expect(unquoteGitPath('"\\a\\b\\v\\f\\r"')).toBe('\u0007\b\u000b\f\r')
    expect(unquoteGitPath('"\\q"')).toBe('q')
    expect(unquoteGitPath('"' + 'x\\' + '"')).toBe('x\\')
  })
})
