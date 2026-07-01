import { describe, expect, it } from 'vitest'
import { markCommitForReword, markCommitsForSquash } from './rebase'

describe('markCommitForReword', () => {
  const hash = '125c15ed41cf1b761557e592b83bf2f856c1070e'

  it('marks the matching commit as reword', () => {
    const todo = [
      `pick ${hash.slice(0, 7)} Old subject`,
      'pick abcdef0 Later subject'
    ].join('\n')

    expect(markCommitForReword(todo, hash)).toBe(
      [`reword ${hash.slice(0, 7)} Old subject`, 'pick abcdef0 Later subject'].join('\n')
    )
  })

  it('leaves unrelated commits unchanged', () => {
    const todo = 'pick abcdef0 Only commit'
    expect(markCommitForReword(todo, hash)).toBe(todo)
  })

  it('converts edit to reword for the target commit', () => {
    const todo = `edit ${hash} Subject`
    expect(markCommitForReword(todo, hash)).toBe(`reword ${hash} Subject`)
  })
})

describe('markCommitsForSquash', () => {
  const hashes = ['1111111', '2222222', '3333333']

  it('keeps the oldest commit as pick and squashes the rest', () => {
    const todo = [
      'pick 1111111 First',
      'pick 2222222 Second',
      'pick 3333333 Third',
      'pick abcdef0 Outside'
    ].join('\n')

    expect(markCommitsForSquash(todo, hashes)).toBe(
      [
        'pick 1111111 First',
        'squash 2222222 Second',
        'squash 3333333 Third',
        'pick abcdef0 Outside'
      ].join('\n')
    )
  })
})
