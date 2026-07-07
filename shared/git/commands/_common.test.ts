import { describe, expect, it } from 'vitest'
import {
  aheadBehindArgs,
  endOfOptionsArg,
  localBranchRef,
  upstreamAheadBehindArgs,
  withPaths,
  withWordDiff
} from './_common'

describe('withPaths', () => {
  it('appends -- and paths', () => {
    expect(withPaths(['add'], ['a.ts', 'b.ts'])).toEqual(['add', '--', 'a.ts', 'b.ts'])
  })

  it('returns args unchanged when paths empty', () => {
    expect(withPaths(['add', '-A'], [])).toEqual(['add', '-A'])
  })
})

describe('endOfOptionsArg', () => {
  it('wraps ref with --end-of-options', () => {
    expect(endOfOptionsArg('feature/login')).toEqual(['--end-of-options', 'feature/login'])
  })
})

describe('localBranchRef', () => {
  it('builds refs/heads path', () => {
    expect(localBranchRef('main')).toBe('refs/heads/main')
  })
})

describe('aheadBehindArgs', () => {
  it('builds rev-list left-right count', () => {
    expect(aheadBehindArgs('origin/main', 'main')).toEqual([
      'rev-list',
      '--left-right',
      '--count',
      'origin/main...main'
    ])
  })
})

describe('upstreamAheadBehindArgs', () => {
  it('uses @{upstream} and HEAD', () => {
    expect(upstreamAheadBehindArgs()).toEqual([
      'rev-list',
      '--left-right',
      '--count',
      '@{upstream}...HEAD'
    ])
  })
})

describe('withWordDiff', () => {
  it('inserts --word-diff=plain after diff', () => {
    expect(withWordDiff(['diff', '--', 'file.ts'], true)).toEqual([
      'diff',
      '--word-diff=plain',
      '--',
      'file.ts'
    ])
  })
})
