import { describe, expect, it } from 'vitest'
import { getNewsMarkdown, getStartupNewsUpdates } from '@/lib/news/content'

describe('news content bundle', () => {
  it('loads NEWS.md from the repo root', () => {
    const md = getNewsMarkdown()
    expect(md).toContain('# News')
    expect(md).toMatch(/## \[/)
  })

  it('exposes recent version updates from NEWS.md', () => {
    const updates = getStartupNewsUpdates()
    expect(updates.length).toBeGreaterThan(0)
    expect(updates.length).toBeLessThanOrEqual(3)
    for (const update of updates) {
      expect(update.version.length).toBeGreaterThan(0)
      expect(update.items.length).toBeGreaterThan(0)
      expect(update.items.every((item) => item.length > 0)).toBe(true)
    }
  })
})
