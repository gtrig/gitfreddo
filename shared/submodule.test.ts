import { describe, expect, it } from 'vitest'
import {
  parseGitmodulesConfig,
  parseSubmoduleStatusLine,
  submoduleRecursionCloneArgs,
  submoduleRecursionFetchArgs,
  submoduleStatusFromPrefix,
  pushSubmoduleRecursionArgs
} from './submodule'

describe('parseGitmodulesConfig', () => {
  it('parses submodule sections', () => {
    const stdout = [
      'submodule.vendor.path=vendor/lib',
      'submodule.vendor.url=https://example.com/lib.git',
      'submodule.vendor.branch=main'
    ].join('\n')

    expect(parseGitmodulesConfig(stdout)).toEqual([
      {
        name: 'vendor',
        path: 'vendor/lib',
        url: 'https://example.com/lib.git',
        branch: 'main'
      }
    ])
  })
})

describe('parseSubmoduleStatusLine', () => {
  it('parses initialized and dirty lines', () => {
    expect(parseSubmoduleStatusLine(' 1234567 vendor/lib (heads/main)')).toEqual({
      prefix: ' ',
      sha: '1234567',
      path: 'vendor/lib',
      label: 'heads/main'
    })
    expect(parseSubmoduleStatusLine('+abcdef0 vendor/lib (heads/main)')).toEqual({
      prefix: '+',
      sha: 'abcdef0',
      path: 'vendor/lib',
      label: 'heads/main'
    })
    expect(parseSubmoduleStatusLine('-1234567 vendor/lib')).toEqual({
      prefix: '-',
      sha: '1234567',
      path: 'vendor/lib',
      label: undefined
    })
  })
})

describe('submoduleStatusFromPrefix', () => {
  it('maps git prefixes to statuses', () => {
    expect(submoduleStatusFromPrefix(' ')).toBe('initialized')
    expect(submoduleStatusFromPrefix('-')).toBe('uninitialized')
    expect(submoduleStatusFromPrefix('+')).toBe('ahead')
    expect(submoduleStatusFromPrefix('U')).toBe('dirty')
  })
})

describe('recursion args', () => {
  it('maps settings to git flags', () => {
    expect(submoduleRecursionCloneArgs('always')).toEqual(['--recurse-submodules', '--jobs', '8'])
    expect(submoduleRecursionFetchArgs('on-demand')).toEqual(['--recurse-submodules=on-demand'])
    expect(pushSubmoduleRecursionArgs('check')).toEqual(['--recurse-submodules=check'])
  })
})
