import { describe, expect, it } from 'vitest'
import en from './en.json'
import el from './el.json'

function flattenStrings(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenStrings(value as Record<string, unknown>, path))
    } else if (typeof value === 'string') {
      out[path] = value
    }
  }
  return out
}

describe('locale catalogs', () => {
  const enFlat = flattenStrings(en)
  const elFlat = flattenStrings(el)

  it('el.json contains every en.json key', () => {
    const missing = Object.keys(enFlat).filter((key) => !(key in elFlat))
    expect(missing).toEqual([])
  })

  it('en.json contains every el.json key', () => {
    const missing = Object.keys(elFlat).filter((key) => !(key in enFlat))
    expect(missing).toEqual([])
  })
})
