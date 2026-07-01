import { describe, expect, it } from 'vitest'
import { markCommitForReword } from './rebase'

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
