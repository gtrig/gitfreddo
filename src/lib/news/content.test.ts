import { describe, expect, it } from 'vitest'
import { getNewsMarkdown, getStartupNewsItems } from '@/lib/news/content'

describe('news content bundle', () => {
  it('loads NEWS.md from the repo root', () => {
    const md = getNewsMarkdown()
    expect(md).toContain('# News')
    expect(md).toMatch(/## \[/)
  })

  it('exposes startup bullets from the newest non-empty section', () => {
    const items = getStartupNewsItems()
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((item) => item.length > 0)).toBe(true)
  })
})
