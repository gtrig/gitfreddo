import { describe, expect, it } from 'vitest'
import { appendGitignoreEntry, gitignoreHasEntry } from '@shared/gitignore'

describe('gitignoreHasEntry', () => {
  it('detects an exact path match', () => {
    const content = 'node_modules/\nbuild/\n'
    expect(gitignoreHasEntry(content, 'build/')).toBe(true)
    expect(gitignoreHasEntry(content, 'dist/')).toBe(false)
  })

  it('treats folder paths with or without a trailing slash as equivalent', () => {
    const content = 'build/\n'
    expect(gitignoreHasEntry(content, 'build')).toBe(true)
    expect(gitignoreHasEntry(content, 'build/')).toBe(true)
  })

  it('ignores comments and blank lines', () => {
    const content = '# dependencies\n\nnode_modules/\n'
    expect(gitignoreHasEntry(content, 'node_modules/')).toBe(true)
  })
})

describe('appendGitignoreEntry', () => {
  it('appends a new entry to empty content', () => {
    expect(appendGitignoreEntry('', 'temp.log')).toBe('temp.log\n')
  })

  it('appends with a newline when content lacks a trailing newline', () => {
    expect(appendGitignoreEntry('node_modules/', 'temp.log')).toBe('node_modules/\ntemp.log\n')
  })

  it('does not duplicate an existing entry', () => {
    const content = 'node_modules/\n'
    expect(appendGitignoreEntry(content, 'node_modules/')).toBe(content)
  })

  it('normalizes leading slashes', () => {
    expect(appendGitignoreEntry('', '/temp.log')).toBe('temp.log\n')
  })

  it('appends directory paths with a trailing slash', () => {
    expect(appendGitignoreEntry('', 'build', true)).toBe('build/\n')
  })
})
